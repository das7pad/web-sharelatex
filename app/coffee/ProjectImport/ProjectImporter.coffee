logger = require "logger-sharelatex"
settings = require "settings-sharelatex"
metrics = require "metrics-sharelatex"
Path = require "path"
uuid = require "uuid"
_ = require "underscore"
async = require "async"
fs = require "fs"
request = require "request"

oAuthRequest = require "../OAuth/OAuthRequest"
UserMapper = require "../OverleafUsers/UserMapper"

ProjectCreationHandler = require "../../../../../app/js/Features/Project/ProjectCreationHandler"
ProjectEntityUpdateHandler = require "../../../../../app/js/Features/Project/ProjectEntityUpdateHandler"
ProjectDeleter = require "../../../../../app/js/Features/Project/ProjectDeleter"
{ProjectInvite} = require "../../../../../app/js/models/ProjectInvite"
CollaboratorsHandler = require "../../../../../app/js/Features/Collaborators/CollaboratorsHandler"
PrivilegeLevels = require "../../../../../app/js/Features/Authorization/PrivilegeLevels"
{
	UnsupportedFileTypeError
	UnsupportedBrandError
	UnsupportedExportRecordsError
	V1HistoryNotSyncedError
} = require "../../../../../app/js/Features/Errors/Errors"

ENGINE_TO_COMPILER_MAP = {
	latex_dvipdf: "latex"
	pdflatex:     "pdflatex"
	xelatex:      "xelatex"
	lualatex:     "lualatex"
}

V1_HISTORY_SYNC_REQUEST_TIMES = [
	0, 0.5, 1, 2, 5, 10, 30, 45
]

OVERLEAF_BRAND_VARIATION_ID = 52

SUPPORTED_V1_EXT_AGENTS = ['wlfile', 'url', 'wloutput']

module.exports = ProjectImporter =
	importProject: (v1_project_id, user_id, callback = (error, v2_project_id) ->) ->
		logger.log {v1_project_id, user_id}, "importing project from overleaf"
		metrics.inc "project-import.attempt"

		ProjectImporter._startExport v1_project_id, user_id, (error, doc) ->
			if error?
				logger.err {error}, "failed to start project import"
				metrics.inc "project-import.error.total"
				metrics.inc "project-import.error.#{error.name}"
				return callback(error)
			ProjectImporter._createV2ProjectFromV1Doc v1_project_id, user_id, doc, callback

	_createV2ProjectFromV1Doc: (v1_project_id, user_id, doc, callback = (error, v2_project_id) ->) ->
		async.waterfall [
			(cb) ->
				ProjectImporter._initSharelatexProject user_id, doc, cb
			(v2_project_id, cb) ->
				ProjectImporter._importV1ProjectDataIntoV2Project v1_project_id, v2_project_id, user_id, doc, cb
		], (importError, v2_project_id) ->
			if importError?
				logger.err {importError, errorMessage: importError.message, v1_project_id, v1_project_id}, "failed to import project"
				metrics.inc "project-import.error.total"
				metrics.inc "project-import.error.#{importError.name}"
				ProjectImporter._cancelExport v1_project_id, user_id, (cancelError) ->
					if cancelError?
						logger.err {cancelError, errorMessage: cancelError.message, v1_project_id, v2_project_id}, "failed to cancel project import"
					callback(importError)
			else
				metrics.inc "project-import.success"
				callback null, v2_project_id

	_importV1ProjectDataIntoV2Project: (v1_project_id, v2_project_id, user_id, doc, callback = (error, v2_project_id) ->) ->
		async.series [
			(cb) ->
				ProjectImporter._importInvites v2_project_id, doc.invites, cb
			(cb) ->
				ProjectImporter._importFiles v2_project_id, user_id, doc.files, cb
			(cb) ->
				ProjectImporter._waitForV1HistoryExport v1_project_id, user_id, cb
			(cb) ->
				ProjectImporter._confirmExport v1_project_id, v2_project_id, user_id, cb
		], (error) ->
			if error?
				# Since _initSharelatexProject created a v2 project we want to
				# clean it up if any of these steps which happened afterwards fail.
				ProjectDeleter.deleteProject v2_project_id, (deleteError) ->
					if deleteError?
						logger.err {deleteError, errorMessage: deleteError.message, v1_project_id, v2_project_id}, "failed to delete imported project"
					callback(error)
			else
				callback(null, v2_project_id)

	_startExport: (v1_project_id, user_id, callback = (error, doc) ->) ->
		oAuthRequest user_id, {
			url: "#{settings.overleaf.host}/api/v1/sharelatex/docs/#{v1_project_id}/export/start"
			method: "POST"
			json: true
		}, (error, doc) ->
			return callback(error) if error?
			logger.log {v1_project_id, user_id, doc}, "got doc for project from overleaf"
			return callback(null, doc)

	_initSharelatexProject: (user_id, doc = {}, callback = (err, project) ->) ->
		if !doc.title? or !doc.id? or !doc.latest_ver_id? or !doc.latex_engine? or !doc.token? or !doc.read_token?
			return callback(new Error("expected doc title, id, latest_ver_id, latex_engine, token and read_token"))
		if doc.brand_variation_id? && doc.brand_variation_id != OVERLEAF_BRAND_VARIATION_ID
			return callback(new UnsupportedBrandError("project has brand variation: #{doc.brand_variation_id}"))
		if doc.has_export_records? and doc.has_export_records
			return callback(new UnsupportedExportRecordsError("project has export records"))
		if doc.title == ""
			doc.title = "Untitled"

		attributes =
			overleaf:
				id: doc.id
				imported_at_ver_id: doc.latest_ver_id
				history:
					display: true
					id: doc.id
			tokens:
				readOnly: doc.read_token
				readAndWrite: doc.token

		if doc.template_id?
			attributes.fromV1TemplateId = doc.template_id
			attributes.fromV1TemplateVersionId = doc.template_ver_id

		if doc.general_access == 'none'
			attributes.publicAccesLevel = 'private'
		else if doc.general_access == 'read_write'
			attributes.publicAccesLevel = 'tokenBased'
		if ENGINE_TO_COMPILER_MAP[doc.latex_engine]?
			attributes.compiler = ENGINE_TO_COMPILER_MAP[doc.latex_engine]
		# allow imported projects to use a separate image
		if settings.importedImageName?
			attributes.imageName = settings.importedImageName

		ProjectCreationHandler.createBlankProject user_id, doc.title, attributes, (error, project) ->
			return callback(error) if error?
			return callback(null, project._id)

	_importInvites: (project_id, invites = [], callback = (error) ->) ->
		async.mapSeries(invites, (invite, cb) ->
			ProjectImporter._importInvite project_id, invite, cb
		, callback)

	_importInvite: (project_id, invite, callback = (error) ->) ->
		if invite.invitee?
			ProjectImporter._importAcceptedInvite(project_id, invite, callback)
		else
			ProjectImporter._importPendingInvite(project_id, invite, callback)

	ACCESS_LEVEL_MAP: {
		"read_write": PrivilegeLevels.READ_AND_WRITE
		"read_only": PrivilegeLevels.READ_ONLY
	}
	_importAcceptedInvite: (project_id, invite, callback = (error) ->) ->
		if !invite.inviter? or !invite.invitee? or !invite.access_level?
			return callback(new Error("expected invite inviter, invitee and access_level"))
		logger.log {project_id, invite}, "importing accepted invite from overleaf"
		privilegeLevel = ProjectImporter.ACCESS_LEVEL_MAP[invite.access_level]
		UserMapper.getSlIdFromOlUser invite.inviter, (error, inviter_user_id) ->
			return callback(error) if error?
			UserMapper.getSlIdFromOlUser invite.invitee, (error, invitee_user_id) ->
				return callback(error) if error?
				CollaboratorsHandler.addUserIdToProject project_id, inviter_user_id, invitee_user_id, privilegeLevel, callback
		
	_importPendingInvite: (project_id, invite, callback = (error) ->) ->
		if !invite.inviter? or !invite.code? or !invite.email? or !invite.access_level?
			return callback(new Error("expected invite inviter, code, email and access_level"))
		logger.log {project_id, invite}, "importing pending invite from overleaf"
		privilegeLevel = ProjectImporter.ACCESS_LEVEL_MAP[invite.access_level]
		UserMapper.getSlIdFromOlUser invite.inviter, (error, inviter_user_id) ->
			return callback(error) if error?
			ProjectInvite.create {
				email: invite.email
				token: invite.code
				sendingUserId: inviter_user_id
				projectId: project_id
				privileges: privilegeLevel
			}, callback

	_importFiles: (project_id, user_id, files = [], callback = (error) ->) ->
		async.mapSeries(files, (file, cb) ->
			ProjectImporter._importFile project_id, user_id, file, cb
		, callback)

	_importFile: (project_id, user_id, file, callback = (error) ->) ->
		if !file.type? or !file.file?
			return callback(new Error("expected file.file and type"))
		path = "/" + file.file
		dirname = Path.dirname(path)
		name = Path.basename(path)
		logger.log {path: file.file, project_id, dirname, name, type: file.type}, "importing file"
		ProjectEntityUpdateHandler.mkdirp project_id, dirname, (error, folders, lastFolder) ->
			return callback(error) if error?
			folder_id = lastFolder._id
			if file.type == "src"
				if !file.latest_content?
					return callback(new Error("expected file.latest_content"))
				# We already have history entries, we just want to get the SL content in the same state,
				# so don't send add requests to the history service for these new docs
				ProjectEntityUpdateHandler.addDocWithoutUpdatingHistory project_id, folder_id, name, file.latest_content.split("\n"), user_id, (error, doc) ->
					return callback(error) if error?
					if file.main
						ProjectEntityUpdateHandler.setRootDoc project_id, doc._id, callback
					else
						callback()
			else if file.type == "att"
				if !file.file_path?
					return callback(new Error("expected file.file_path"))
				ProjectImporter._writeS3ObjectToDisk file.file_path, (error, pathOnDisk) ->
					return callback(error) if error?
					ProjectEntityUpdateHandler.addFileWithoutUpdatingHistory project_id,
						folder_id, name, pathOnDisk, null, user_id, callback
			else if file.type == "ext"
				if file.agent not in SUPPORTED_V1_EXT_AGENTS
					return callback(
						new UnsupportedFileTypeError("expected file.agent to be valid, instead got '#{file.agent}'")
					)
				if !file.file_path?
					return callback(new Error("expected file.file_path"))
				if !file.agent_data?
					return callback(new Error("expected file.agent_data"))

				ProjectImporter._buildLinkedFileDataForExtFile file, (err, linkedFileData) ->
					return callback(err) if err?
					if !linkedFileData?
						return callback(new Error('Could not build linkedFileData for agent #{file.agent}'))
					ProjectImporter._writeS3ObjectToDisk file.file_path, (error, pathOnDisk) ->
						return callback(error) if error?
						ProjectEntityUpdateHandler.addFileWithoutUpdatingHistory project_id,
							folder_id, name, pathOnDisk, linkedFileData, user_id, callback
			else
				logger.warn {type: file.type, path: file.file, project_id}, "unknown file type"
				callback(new UnsupportedFileTypeError("unknown file type: #{file.type}"))

	_buildLinkedFileDataForExtFile: (file, callback=(err, linkedFileData)->) ->
		if file.agent == 'url'
			callback(null, {
				provider: 'url',
				url: file.agent_data.url
			})
		else if file.agent == 'wlfile'
			ProjectImporter._getDocIdFromWriteToken file.agent_data.doc, (err, doc_id) ->
				return callback(err) if err?
				callback(null, {
					provider: 'project_file',
					v1_source_doc_id: doc_id,
					source_entity_path: "/#{file.agent_data.file}",
					source_project_display_name: file.agent_data.source_doc_display_name
				})
		else if file.agent == 'wloutput'
			ProjectImporter._getDocIdFromWriteToken file.agent_data.doc, (err, doc_id) ->
				return callback(err) if err?
				callback(null, {
					provider: 'project_output_file',
					v1_source_doc_id: doc_id,
					source_output_file_path: "output.pdf",
					source_project_display_name: file.agent_data.source_doc_display_name
				})
		else
			callback(null, null)

	_getDocIdFromWriteToken: (token, callback) ->
		try
			doc_id = parseInt(token.match(/^(\d+).*$/)[0], 10)
			return callback(null, doc_id)
		catch err
			return callback(err)

	_writeS3ObjectToDisk: (filePath, callback = (error, pathOnDisk) ->) ->
		encodedFilePath = filePath.split('/').map(encodeURIComponent).join('/')
		options = {
			url: "#{settings.overleaf.s3.host}/#{encodedFilePath}"
		}
		if settings.overleaf.s3.key? and settings.overleaf.s3.secret?
			options.aws =
				key: settings.overleaf.s3.key
				secret: settings.overleaf.s3.secret
		ProjectImporter._writeUrlToDisk options, callback

	_writeUrlToDisk: (options, callback = (error, pathOnDisk) ->) ->
			callback = _.once(callback)

			pathOnDisk = "#{settings.path.dumpFolder}/#{uuid.v4()}"

			readStream = request.get options
			writeStream = fs.createWriteStream(pathOnDisk)

			onError = (error) ->
				logger.err {err: error}, "error writing URL to disk"
				callback(error)

			readStream.on 'error', onError
			writeStream.on 'error', onError

			writeStream.on "finish", ->
				callback null, pathOnDisk

			readStream.on 'response', (response) ->
				if 200 <= response.statusCode < 300
					readStream.pipe(writeStream)
				else
					error = new Error("Overleaf s3 returned non-success code: #{response.statusCode}")
					logger.error {err: error, options}, "overleaf s3 error"
					return callback(error)

	_waitForV1HistoryExport: (v1_project_id, user_id, callback = (error) ->) ->
		ProjectImporter._checkV1HistoryExportStatus v1_project_id, user_id, 0, callback

	_checkV1HistoryExportStatus: (v1_project_id, user_id, requestCount, callback = (error) ->) ->
		oAuthRequest user_id, {
			url: "#{settings.overleaf.host}/api/v1/sharelatex/docs/#{v1_project_id}/export/history"
			method: "GET"
			json: true
		}, (error, status) ->
			if !status?.exported
				error ||= new V1HistoryNotSyncedError('v1 history not synced')

			if error?
				logger.log {v1_project_id, user_id, requestCount, error}, "error checking v1 history sync"
				if requestCount >= V1_HISTORY_SYNC_REQUEST_TIMES.length
					return callback(error)
				else
					interval = (V1_HISTORY_SYNC_REQUEST_TIMES[requestCount + 1] - V1_HISTORY_SYNC_REQUEST_TIMES[requestCount]) * 1000
					setTimeout(
						() -> ProjectImporter._checkV1HistoryExportStatus v1_project_id, user_id, requestCount + 1, callback
						interval
					)
			else
				callback(null)


	_confirmExport: (v1_project_id, v2_project_id, user_id, callback = (error) ->) ->
		oAuthRequest user_id, {
			url: "#{settings.overleaf.host}/api/v1/sharelatex/docs/#{v1_project_id}/export/confirm"
			method: "POST"
			json:
				doc: { v2_project_id }
		}, callback

	_cancelExport: (v1_project_id, user_id, callback = (error) ->) ->
		oAuthRequest user_id, {
			url: "#{settings.overleaf.host}/api/v1/sharelatex/docs/#{v1_project_id}/export/cancel"
			method: "POST"
		}, callback
