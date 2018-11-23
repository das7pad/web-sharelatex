logger = require "logger-sharelatex"
settings = require "settings-sharelatex"
metrics = require "metrics-sharelatex"
Path = require "path"
uuid = require "uuid"
_ = require "underscore"
async = require "async"
fs = require "fs"
request = require "request"

UserMapper = require "../OverleafUsers/UserMapper"
V1SharelatexApi = require "../V1SharelatexApi"

ProjectCreationHandler = require "../../../../../app/js/Features/Project/ProjectCreationHandler"
ProjectDetailsHandler = require "../../../../../app/js/Features/Project/ProjectDetailsHandler"
ProjectEntityUpdateHandler = require "../../../../../app/js/Features/Project/ProjectEntityUpdateHandler"
ProjectDeleter = require "../../../../../app/js/Features/Project/ProjectDeleter"
{ProjectInvite} = require "../../../../../app/js/models/ProjectInvite"
CollaboratorsHandler = require "../../../../../app/js/Features/Collaborators/CollaboratorsHandler"
TokenAccessHandler = require "../../../../../app/js/Features/TokenAccess/TokenAccessHandler"
TagsHandler = require "../../../../../app/js/Features/Tags/TagsHandler"
PrivilegeLevels = require "../../../../../app/js/Features/Authorization/PrivilegeLevels"
{
	UnsupportedFileTypeError
	UnsupportedExportRecordsError
	V1HistoryNotSyncedError
} = require "../../../../../app/js/Features/Errors/Errors"
UserGetter = require "../../../../../app/js/Features/User/UserGetter"

ENGINE_TO_COMPILER_MAP = {
	latex_dvipdf: "latex"
	pdflatex:     "pdflatex"
	xelatex:      "xelatex"
	lualatex:     "lualatex"
}

V1_HISTORY_SYNC_REQUEST_TIMES = [
	0, 0.5, 1, 2, 5, 10, 30, 45
]

SUPPORTED_V1_EXT_AGENTS = ['wlfile', 'url', 'wloutput', 'mendeley']

module.exports = ProjectImporter =
	importProject: (v1_project_id, v2_user_id, callback = (error, v2_project_id) ->) ->
		logger.log {v1_project_id, v2_user_id}, "importing project from overleaf"
		metrics.inc "project-import.attempt"

		UserGetter.getUser v2_user_id, (error, user) ->
			return callback(error) if error?

			v1_user_id = user?.overleaf?.id
			if !v1_user_id
				logger.err {error}, "failed to import because user is not a V1 user"
				return callback(new Error("failed to import because user is not a V1 user"))

			ProjectImporter._startExport v1_project_id, v1_user_id, (error, doc) ->
				if error?
					logger.err {error}, "failed to start project import"
					metrics.inc "project-import.error.total"
					metrics.inc "project-import.error.#{error.name}"
					return callback(error)
				ProjectImporter._createV2ProjectFromV1Doc v1_project_id, v1_user_id, v2_user_id, doc, callback

	_createV2ProjectFromV1Doc: (v1_project_id, v1_user_id, v2_user_id, doc, callback = (error, v2_project_id) ->) ->
		async.waterfall [
			(cb) ->
				ProjectImporter._initSharelatexProject v2_user_id, doc, cb
			(v2_project_id, cb) ->
				ProjectImporter._importV1ProjectDataIntoV2Project v1_project_id, v2_project_id, v1_user_id, v2_user_id, doc, cb
		], (importError, v2_project_id) ->
			if importError?
				logger.err {importError, errorMessage: importError.message, v1_project_id, v1_project_id}, "failed to import project"
				metrics.inc "project-import.error.total"
				metrics.inc "project-import.error.#{importError.name}"
				ProjectImporter._cancelExport v1_project_id, v1_user_id, (cancelError) ->
					if cancelError?
						logger.err {cancelError, errorMessage: cancelError.message, v1_project_id, v2_project_id}, "failed to cancel project import"
					callback(importError)
			else
				metrics.inc "project-import.success"
				callback null, v2_project_id

	_importV1ProjectDataIntoV2Project: (v1_project_id, v2_project_id, v1_user_id, v2_user_id, doc, callback = (error, v2_project_id) ->) ->
		async.series [
			(cb) ->
				ProjectImporter._importInvites v1_project_id, v2_project_id, doc.invites, cb
			(cb) ->
				ProjectImporter._importTokenAccessInvites v1_project_id, v2_project_id, doc.token_access_invites, cb
			(cb) ->
				ProjectImporter._importFiles v2_project_id, v2_user_id, doc.files, cb
			(cb) ->
				ProjectImporter._waitForV1HistoryExport v1_project_id, v1_user_id, cb
			(cb) ->
				ProjectImporter._importLabels doc.id, v2_project_id, v1_user_id, cb
			(cb) ->
				ProjectImporter._importTags v2_project_id, v2_user_id, doc.tags, cb
			(cb) ->
				ProjectImporter._confirmExport v1_project_id, v2_project_id, v1_user_id, cb
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

	_startExport: (v1_project_id, v1_user_id, callback = (error, doc) ->) ->
		V1SharelatexApi.request {
			method: 'POST'
			url: "#{settings.apis.v1.url}/api/v1/sharelatex/users/#{v1_user_id}/docs/#{v1_project_id}/export/start"
		}, (error, res, doc) ->
			return callback(error) if error?
			logger.log {v1_project_id, v1_user_id, doc}, "got doc for project from overleaf"
			return callback(null, doc)

	_initSharelatexProject: (v2_user_id, doc = {}, callback = (err, project) ->) ->
		if !doc.title? or !doc.id? or !doc.latest_ver_id? or !doc.latex_engine? or !doc.token? or !doc.read_token?
			return callback(new Error("expected doc title, id, latest_ver_id, latex_engine, token and read_token"))
		if doc.has_export_records? and doc.has_export_records
			return callback(new UnsupportedExportRecordsError("project has export records"))
		# clean up project name
		doc.title = ProjectDetailsHandler.fixProjectName(doc.title)

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

		if doc.brand_variation_id?
			attributes.brandVariationId = doc.brand_variation_id

		if doc.general_access == 'none'
			attributes.publicAccesLevel = 'private'
		else if doc.general_access == 'read_write'
			attributes.publicAccesLevel = 'tokenBased'
		if ENGINE_TO_COMPILER_MAP[doc.latex_engine]?
			attributes.compiler = ENGINE_TO_COMPILER_MAP[doc.latex_engine]
		# allow imported projects to use a separate image
		if settings.importedImageName?
			attributes.imageName = settings.importedImageName

		# make the project name unique on import
		# use the numerical part of the overleaf id as an optional suffix
		numericId = doc.token.replace(/a-z/g,'')
		ProjectDetailsHandler.generateUniqueName v2_user_id, doc.title, [" (#{numericId})"], (error, v2_project_name) ->
			return callback(error) if error?
			ProjectCreationHandler.createBlankProject v2_user_id, v2_project_name, attributes, (error, project) ->
				return callback(error) if error?
				return callback(null, project._id)

	_importInvites: (v1_project_id, v2_project_id, invites = [], callback = (error) ->) ->
		async.mapSeries(invites, (invite, cb) ->
			ProjectImporter._importInvite v1_project_id, v2_project_id, invite, cb
		, callback)

	_importInvite: (v1_project_id, v2_project_id, invite, callback = (error) ->) ->
		if invite.invitee?
			ProjectImporter._importAcceptedInvite(v1_project_id, v2_project_id, invite, callback)
		else
			ProjectImporter._importPendingInvite(v2_project_id, invite, callback)

	_importTokenAccessInvites: (v1_project_id, v2_project_id, invites = [], callback = (error) ->) ->
		async.mapSeries(invites, (invite, cb) ->
			ProjectImporter._importTokenAccessInvite v1_project_id, v2_Project_id, invite, cb
		, callback)

	ACCESS_LEVEL_MAP: {
		"read_write": PrivilegeLevels.READ_AND_WRITE
		"read_only": PrivilegeLevels.READ_ONLY
	}
	_importAcceptedInvite: (v1_project_id, v2_project_id, invite, callback = (error) ->) ->
		if !invite.inviter? or !invite.invitee? or !invite.access_level?
			return callback(new Error("expected invite inviter, invitee and access_level"))
		logger.log {v2_project_id, invite}, "importing accepted invite from overleaf"
		privilegeLevel = ProjectImporter.ACCESS_LEVEL_MAP[invite.access_level]
		UserMapper.getSlIdFromOlUser invite.inviter, (error, inviter_user_id) ->
			return callback(error) if error?
			UserMapper.getSlIdFromOlUser invite.invitee, (error, invitee_user_id) ->
				return callback(error) if error?
				CollaboratorsHandler.addUserIdToProject v2_project_id, inviter_user_id, invitee_user_id, privilegeLevel, (error) ->
					return callback(error) if error?
					ProjectImporter._importInviteTags(v1_project_id, v2_project_id, invite.invitee.id, invitee_user_id, callback)

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

	_importTokenAccessInvite: (v1_project_id, v2_project_id, invite, callback = (error) ->) ->
		if !invite.id? or !invite.email?
			return callback(new Error('expected invite id and email'))
		UserMapper.getSlIdFromOlUser invite, (error, inviteeUserId) ->
			return callback(error) if error?
			# v1 token-access invites (called UserDocs in v1) are only recorded for
			# read-write token-accesses, so always grant readAndWriteAccess to v2
			# token-access
			TokenAccessHandler.addReadAndWriteUserToProject inviteeUserId, v2_project_id, (error) ->
				return callback(error) if error?
				ProjectImporter._importInviteTags(v1_project_id, v2_project_id, invite.id, inviteeUserId, callback)

	_importLabels: (v1_project_id, v2_project_id, v1_user_id, callback = (error) ->) ->
		ProjectImporter._getLabels v1_project_id, (error, labels) ->
			return callback(error) if error?
			async.eachSeries(
				labels,
				(label, cb) -> ProjectImporter._importLabel v2_project_id, label, v1_user_id, cb
				callback
			)

	_importLabel: (v2_project_id, label, v1_user_id, callback = (error) ->) ->
		logger.log {v2_project_id, label}, 'importing label'
		if !label.history_version?
			return callback(new Error('cannot import label with no history_version'))
		if !label.user_id?
			logger.log {v2_project_id, label, v1_user_id}, 'no user id on label, defaulting to project owner'
			label.user_id = v1_user_id
		UserMapper.getSlIdFromOlUser {id: label.user_id}, (error, user_id) ->
			return callback(error) if error?
			request.post {
				url: "#{settings.apis.project_history.url}/project/#{v2_project_id}/user/#{user_id}/labels"
				json: {
					version: label.history_version,
					comment: label.comment,
					created_at: label.created_at,
					validate_exists: false # We can trust v1
				}
			}, (error, response) ->
				return callback(error) if error?

				if 200 <= response.statusCode < 300
					callback()
				else
					error = new Error("project-history returned non-success code: #{response.statusCode}")
					error.statusCode = response.statusCode
					callback error

	_importInviteTags: (v1_project_id, v2_project_id, v1_user_id, v2_user_id, callback = (error) ->) ->
		V1SharelatexApi.request {
			method: 'GET'
			url: "#{settings.apis.v1.url}/api/v1/sharelatex/users/#{v1_user_id}/docs/#{v1_project_id}/export/tags"
		}, (error, res, body) ->
			return callback(error) if error?
			logger.log {v1_project_id, v1_user_id, body}, "got tags for project from overleaf"
			ProjectImporter._importTags v2_project_id, v2_user_id, body.tags, callback

	_importTags: (project_id, v2_user_id, tags = [], callback = (error) ->) ->
		async.mapSeries(tags, (tag, cb) ->
			TagsHandler.addProjectToTagName v2_user_id, tag, project_id, cb
		, callback)

	_importFiles: (project_id, v2_user_id, files = [], callback = (error) ->) ->
		async.mapSeries(files, (file, cb) ->
			ProjectImporter._importFile project_id, v2_user_id, file, cb
		, callback)

	_importFile: (project_id, v2_user_id, file, callback = (error) ->) ->
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
				ProjectEntityUpdateHandler.addDocWithoutUpdatingHistory project_id, folder_id, name, file.latest_content.split("\n"), v2_user_id, (error, doc) ->
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
						folder_id, name, pathOnDisk, null, v2_user_id, callback
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
							folder_id, name, pathOnDisk, linkedFileData, v2_user_id, callback
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
				})
		else if file.agent == 'wloutput'
			ProjectImporter._getDocIdFromWriteToken file.agent_data.doc, (err, doc_id) ->
				return callback(err) if err?
				callback(null, {
					provider: 'project_output_file',
					v1_source_doc_id: doc_id,
					source_output_file_path: "output.pdf",
				})
		else if file.agent == 'mendeley'
			callback(null, {
				provider: 'mendeley',
				v1_importer_id: file.agent_data.importer_id,
				group_id: file.agent_data.group
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

	_waitForV1HistoryExport: (v1_project_id, v1_user_id, callback = (error) ->) ->
		ProjectImporter._checkV1HistoryExportStatus v1_project_id, v1_user_id, 0, callback

	_checkV1HistoryExportStatus: (v1_project_id, v1_user_id, requestCount, callback = (error) ->) ->
		V1SharelatexApi.request {
			method: 'GET'
			url: "#{settings.apis.v1.url}/api/v1/sharelatex/users/#{v1_user_id}/docs/#{v1_project_id}/export/history"
		}, (error, res, status) ->
			return callback(error) if error?

			if !status?.exported
				error ?= new V1HistoryNotSyncedError('v1 history not synced')

			if error?
				logger.log {v1_project_id, v1_user_id, requestCount, error}, "error checking v1 history sync"
				if requestCount >= V1_HISTORY_SYNC_REQUEST_TIMES.length
					return callback(error)
				else
					interval = (V1_HISTORY_SYNC_REQUEST_TIMES[requestCount + 1] - V1_HISTORY_SYNC_REQUEST_TIMES[requestCount]) * 1000
					setTimeout(
						() -> ProjectImporter._checkV1HistoryExportStatus v1_project_id, v1_user_id, requestCount + 1, callback
						interval
					)
			else
				callback(null)

	_getLabels: (v1_project_id, callback = (error, labels) ->) ->
		V1SharelatexApi.request {
			method: 'GET'
			url: "#{settings.apis.v1.url}/api/v1/sharelatex/docs/#{v1_project_id}/labels"
			json: true
		}, (error, res, data) ->
			if error?
				callback(error)
			else if !data?.labels?
				callback(new Error('expected labels'))
			else
				callback(null, data.labels)

	_confirmExport: (v1_project_id, v2_project_id, v1_user_id, callback = (error) ->) ->
		V1SharelatexApi.request {
			method: 'POST'
			url: "#{settings.apis.v1.url}/api/v1/sharelatex/users/#{v1_user_id}/docs/#{v1_project_id}/export/confirm"
			json:
				doc: { v2_project_id }
		}, (error, res) ->
			if error?
				callback(error)
			else
				callback()

	_cancelExport: (v1_project_id, v1_user_id, callback = (error) ->) ->
		V1SharelatexApi.request {
			method: 'POST'
			url: "#{settings.apis.v1.url}/api/v1/sharelatex/users/#{v1_user_id}/docs/#{v1_project_id}/export/cancel"
		}, (error, res) ->
			if error?
				callback(error)
			else
				callback()
