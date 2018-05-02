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

module.exports = ProjectImporter =
	importProject: (v1_project_id, user_id, callback = (error, v2_project_id) ->) ->
		logger.log {v1_project_id, user_id}, "importing project from overleaf"
		metrics.inc "project-import.attempt"
		async.waterfall [
			(cb) ->
				ProjectImporter._startExport v1_project_id, user_id, cb
			(doc, cb) ->
				ProjectImporter._initSharelatexProject user_id, doc, cb
			(doc, v2_project_id, cb) ->
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
								logger.err {deleteError, v1_project_id, v2_project_id}, "failed to delete imported project"
							cb(error)
					else
						cb(null, v2_project_id)
		], (importError, v2_project_id) ->
			if importError?
				logger.err {importError, v1_project_id, v1_project_id}, "failed to import project"
				metrics.inc "project-import.error.total"
				metrics.inc "project-import.error.#{importError.name}"
				ProjectImporter._cancelExport v1_project_id, user_id, (cancelErrror) ->
					if cancelErrror?
						logger.err {cleanUpError, v1_project_id, v2_project_id}, "failed to cancel project import"
					callback importError
			else
				metrics.inc "project-import.success"
				callback null, v2_project_id

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
		if doc.brand_variation_id?
			return callback(new UnsupportedBrandError("project has brand variation: #{doc.brand_variation_id}"))
		if doc.has_export_records? and doc.has_export_records
			return callback(new UnsupportedExportRecordsError("project has export records"))
		if doc.title == ""
			doc.title = "Untitled"
		ProjectCreationHandler.createBlankProject user_id, doc.title, doc.id, (error, project) ->
			return callback(error) if error?
			project.overleaf.id = doc.id
			project.overleaf.imported_at_ver_id = doc.latest_ver_id
			project.overleaf.history.display = true
			if doc.template_id?
				project.fromV1TemplateId = doc.template_id
				project.fromV1TemplateVersionId = doc.template_ver_id

			project.tokens = {
				readOnly: doc.read_token,
				readAndWrite: doc.token
			}
			if doc.general_access == 'none'
				project.publicAccesLevel = 'private'
			else if doc.general_access == 'read_write'
				project.publicAccesLevel = 'tokenBased'
			if ENGINE_TO_COMPILER_MAP[doc.latex_engine]?
				project.compiler = ENGINE_TO_COMPILER_MAP[doc.latex_engine]
			# allow imported projects to use a separate image
			if settings.importedImageName?
				project.imageName = settings.importedImageName
			project.save (error) ->
				return callback(error) if error?
				return callback(null, doc, project._id)

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
					ProjectEntityUpdateHandler.addFileWithoutUpdatingHistory project_id, folder_id, name, pathOnDisk, null, user_id, callback
			else
				logger.warn {type: file.type, path: file.file, project_id}, "unknown file type"
				callback(new UnsupportedFileTypeError("unknown file type: #{file.type}"))

	_writeS3ObjectToDisk: (path, callback = (error, pathOnDisk) ->) ->
		options = {
			url: "#{settings.overleaf.s3.host}/#{path}"
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
