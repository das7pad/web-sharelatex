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

Doc = require('../../../../../app/js/models/Doc').Doc
DocstoreManager = require('../../../../../app/js/Features/Docstore/DocstoreManager')
File = require('../../../../../app/js/models/File').File
FileStoreHandler = require('../../../../../app/js/Features/FileStore/FileStoreHandler')

ProjectCollabratecDetailsHandler = require "../../../../../app/js/Features/Project/ProjectCollabratecDetailsHandler"
ProjectCreationHandler = require "../../../../../app/js/Features/Project/ProjectCreationHandler"
ProjectDetailsHandler = require "../../../../../app/js/Features/Project/ProjectDetailsHandler"
ProjectEntityUpdateHandler = require "../../../../../app/js/Features/Project/ProjectEntityUpdateHandler"
SafePath = require '../../../../../app/js/Features/Project/SafePath'
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

SUPPORTED_V1_EXT_AGENTS = ['wlfile', 'url', 'wloutput', 'mendeley', 'zotero']

MAX_DOC_UPLOADS = 4 # maximum numbers of parallel uploads
MAX_FILE_UPLOADS = 8 # allow more file uploads because they are slower

module.exports = ProjectImporter =
	importProject: (v1_project_id, v2_importer_id, callback = (error, v2_project_id) ->) ->
		logger.log {v1_project_id, v2_importer_id}, "importing project from overleaf"
		metrics.inc "project-import.attempt"

		UserGetter.getUser v2_importer_id, (error, user) ->
			return callback(error) if error?

			v1_importer_id = user?.overleaf?.id
			if !v1_importer_id
				logger.err {error}, "failed to import because user is not a V1 user"
				return callback(new Error("failed to import because user is not a V1 user"))

			ProjectImporter._startExport v1_project_id, v1_importer_id, (error, doc) ->
				if error?
					logger.err {error}, "failed to start project import"
					metrics.inc "project-import.error.total"
					metrics.inc "project-import.error.#{error.name}"
					return callback(error)
				ProjectImporter._createV2ProjectFromV1Doc v1_project_id, v1_importer_id, doc, callback

	_createV2ProjectFromV1Doc: (v1_project_id, v1_importer_id, doc, callback = (error, v2_project_id) ->) ->
		v1_owner_id = doc?.owner?.id
		if !v1_owner_id?
			return callback(new Error('no doc.owner from v1'))
		UserMapper.getSlIdFromOlUser doc.owner, (error, v2_owner_id) ->
			return callback(error) if error?

			async.waterfall [
				(cb) ->
					ProjectImporter._initSharelatexProject v2_owner_id, doc, cb
				(v2_project_id, cb) ->
					ProjectImporter._importV1ProjectDataIntoV2Project v1_project_id, v2_project_id, v1_owner_id, v2_owner_id, v1_importer_id, doc, cb
			], (importError, v2_project_id) ->
				if importError?
					logger.err {importError, errorMessage: importError.message, v1_project_id, v1_project_id}, "failed to import project"
					metrics.inc "project-import.error.total"
					metrics.inc "project-import.error.#{importError.name}"
					ProjectImporter._cancelExport v1_project_id, v1_importer_id, (cancelError) ->
						if cancelError?
							logger.err {cancelError, errorMessage: cancelError.message, v1_project_id, v2_project_id}, "failed to cancel project import"
						callback(importError)
				else
					metrics.inc "project-import.success"
					callback null, v2_project_id

	_importV1ProjectDataIntoV2Project: (v1_project_id, v2_project_id, v1_owner_id, v2_owner_id, v1_importer_id, doc, callback = (error, v2_project_id) ->) ->
		async.series [
			(cb) ->
				ProjectImporter._importInvites v1_project_id, v2_project_id, doc.invites, cb
			(cb) ->
				ProjectImporter._importTokenAccessInvites v1_project_id, v2_project_id, doc.token_access_invites, cb
			(cb) ->
				ProjectImporter._importFiles v2_project_id, doc.files, cb
			(cb) ->
				ProjectImporter._waitForV1HistoryExport v1_project_id, v1_importer_id, cb
			(cb) ->
				ProjectImporter._importLabels doc.id, v2_project_id, v1_owner_id, cb
			(cb) ->
				ProjectImporter._importTags v1_project_id, v2_project_id, v1_owner_id, v2_owner_id, cb
			(cb) ->
				ProjectImporter._importCollabratecUsers v2_project_id, v1_owner_id, v2_owner_id, doc.collabratec_users, cb
			(cb) ->
				ProjectImporter._confirmExport v1_project_id, v2_project_id, v1_importer_id, cb
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

	_startExport: (v1_project_id, v1_importer_id, callback = (error, doc) ->) ->
		V1SharelatexApi.request {
			method: 'POST'
			url: @_exportUrl(v1_project_id, v1_importer_id, "start")
		}, (error, res, doc) ->
			return callback(error) if error?
			logger.log {v1_project_id, v1_importer_id, doc}, "got doc for project from overleaf"
			return callback(null, doc)

	_initSharelatexProject: (v2_owner_id, doc = {}, callback = (err, project) ->) ->
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
		ProjectDetailsHandler.generateUniqueName v2_owner_id, doc.title, [" (#{numericId})"], (error, v2_project_name) ->
			return callback(error) if error?
			ProjectCreationHandler.createBlankProject v2_owner_id, v2_project_name, attributes, (error, project) ->
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
			ProjectImporter._importTokenAccessInvite v1_project_id, v2_project_id, invite, cb
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
					ProjectImporter._importTags(v1_project_id, v2_project_id, invite.invitee.id, invitee_user_id, callback)

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
		if !invite.invitee?
			return callback(new Error('expected invitee'))
		UserMapper.getSlIdFromOlUser invite.invitee, (error, inviteeUserId) ->
			return callback(error) if error?
			# v1 token-access invites (called UserDocs in v1) are only recorded for
			# read-write token-accesses, so always grant readAndWriteAccess to v2
			# token-access
			TokenAccessHandler.addReadAndWriteUserToProject inviteeUserId, v2_project_id, (error) ->
				return callback(error) if error?
				ProjectImporter._importTags(v1_project_id, v2_project_id, invite.invitee.id, inviteeUserId, callback)

	_importLabels: (v1_project_id, v2_project_id, v1_owner_id, callback = (error) ->) ->
		ProjectImporter._getLabels v1_project_id, (error, labels) ->
			return callback(error) if error?
			async.eachSeries(
				labels,
				(label, cb) -> ProjectImporter._importLabel v2_project_id, label, v1_owner_id, cb
				callback
			)

	_importLabel: (v2_project_id, label, v1_owner_id, callback = (error) ->) ->
		logger.log {v2_project_id, label}, 'importing label'
		if !label.history_version?
			return callback(new Error('cannot import label with no history_version'))
		if !label.user_id?
			logger.log {v2_project_id, label, v1_owner_id}, 'no user id on label, defaulting to project owner'
			label.user_id = v1_owner_id
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

	_importTags: (v1_project_id, v2_project_id, v1_user_id, v2_user_id, callback = (error) ->) ->
		V1SharelatexApi.request {
			method: 'GET'
			url: "#{settings.apis.v1.url}/api/v1/sharelatex/users/#{v1_user_id}/docs/#{v1_project_id}/export/tags"
		}, (error, res, body) ->
			return callback(error) if error?
			logger.log {v1_project_id, v1_user_id, body}, "got tags for project from overleaf"
			async.mapSeries(body.tags, (tag, cb) ->
				TagsHandler.addProjectToTagName v2_user_id, tag, v2_project_id, cb
			, callback)

	_importCollabratecUsers: (v2_project_id, v1_owner_id, v2_owner_id, collabratec_users, callback = (error) ->) ->
		return callback() unless collabratec_users? && collabratec_users.length > 0
		ProjectImporter._populateV2UserIds collabratec_users, v1_owner_id, v2_owner_id, (error) ->
			return callback error if error?
			ProjectCollabratecDetailsHandler.setCollabratecUsers v2_project_id, collabratec_users, callback

	_populateV2UserIds: (collabratec_users, v1_owner_id, v2_owner_id, callback = (error) ->) ->
		async.each collabratec_users,
			(collabratec_user, cb) ->
				if collabratec_user.user_id == v1_owner_id
					collabratec_user.user_id = v2_owner_id
					return cb()
				UserMapper.getSlIdFromOlUser {id: collabratec_user.user_id}, (error, v2_user_id) ->
					return cb error if error?
					collabratec_user.user_id = v2_user_id
					cb()
			callback

	_checkFiles: (files) ->
		for file in files
			if !file.type? or !file.file?
				return new Error("expected file.file and type")
			if file.type == "src"
				if !file.latest_content?
					return new Error("expected file.latest_content")
			else if file.type == "att"
				if !file.file_path?
					return new Error("expected file.file_path")
			else if file.type == "ext"
				if !file.file_path?
					return new Error("expected file.file_path")
				if !file.agent_data?
					return new Error("expected file.agent_data")
			else
				return new UnsupportedFileTypeError("unknown file type: #{file.type}")

		# check files have valid names
		for file in files
			path = "/" + file.file
			dirname = Path.dirname(path)
			name = Path.basename(path)
			for folder in dirname.split('/')
				if folder.length > 0 and not SafePath.isCleanFilename folder
					return new Errors.InvalidNameError("invalid element name")
			if not SafePath.isCleanFilename name
				return new Errors.InvalidNameError("invalid element name")

		return null

	_importFiles: (project_id, files = [], callback = (error) ->) ->
		# check files are in expected format
		checkErr = ProjectImporter._checkFiles (files)
		if checkErr?
			logger.warn {project_id, files:files, checkErr:checkErr}, "invalid files in import"
			return callback(checkErr)

		getPath = (file) ->
			path = "/" + file.file
			return {path: path, dirname: Path.dirname(path), name: Path.basename(path)}

		# now upload all the docs in parallel
		uploadDoc = (file, cb) ->
			{path, dirname, name} = getPath(file)
			docLines = file.latest_content.split("\n")
			doc = new Doc name: name
			DocstoreManager.updateDoc project_id.toString(), doc._id.toString(), docLines, 0, {}, (err, modified, rev) ->
				return cb(err) if err?
				cb(null, {file:file, dirname:dirname, name:name, doc:doc})

		# now upload all the files in parallel
		uploadFile = (file, cb) ->
			{path, dirname, name} = getPath(file)
			ProjectImporter._writeS3ObjectToDisk file.file_path, (err, fsPath) ->
				return cb(err) if err?
				fileRef = new File name: name, linkedFileData: file.linkedFileData # optional
				FileStoreHandler.uploadFileFromDisk project_id, fileRef._id, fsPath, (err, fileStoreUrl)->
					return cb(err) if err?
					cb(null, {file:file, dirname:dirname, name:name, fileRef:fileRef, fileStoreUrl:fileStoreUrl})

		# store the uploaded docs and files
		storeDoc = (uploadResult, cb) ->
			{file, dirname, doc} = uploadResult
			ProjectEntityUpdateHandler.mkdirp project_id, dirname, (err, folders, lastFolder) ->
				return cb(err) if err?
				folder_id = lastFolder._id
				ProjectEntityUpdateHandler._addDocAndSendToTpds project_id, folder_id, doc, cb

		storeFile = (uploadResult, cb) ->
			{file, dirname, fileRef} = uploadResult
			ProjectEntityUpdateHandler.mkdirp project_id, dirname, (err, folders, lastFolder) ->
				return cb(err) if err?
				folder_id = lastFolder._id
				ProjectEntityUpdateHandler._addFileAndSendToTpds project_id, folder_id, fileRef, cb

		# store v2 linkedFileData as property on the ext files
		buildLinkedFileData = (file, _cb) ->
			cb = (err) ->
				setImmediate _cb, err  # make the callback asynchronous
			if file.type is "ext" and file.agent in SUPPORTED_V1_EXT_AGENTS
				ProjectImporter._buildLinkedFileDataForExtFile file, (err, linkedFileData) ->
					return cb(err) if err?
					return new Error('Could not build linkedFileData for agent #{file.agent}') if !linkedFileData?
					file.linkedFileData = linkedFileData
					cb()
			else
				cb()

		# select each of the different file types
		srcs = _.filter files, (f) -> f.type is "src"
		attsAndExts = _.filter files, (f) -> f.type in ["att", "ext"]

		async.series [
			(cb) ->
				async.eachSeries files, buildLinkedFileData, cb
			(cb) ->
				async.mapLimit srcs, MAX_DOC_UPLOADS, uploadDoc, cb
			(cb) ->
				async.mapLimit attsAndExts, MAX_FILE_UPLOADS, uploadFile, cb
		], (err, results) ->
			return callback(err) if err?
			[linkResult, uploadedDocs, uploadedFiles] = results
			# now put the references in mongo. In future we could do this in a
			# single operation, computing and storing the entire folder tree in
			# a single mongo operation.  Since uploading is the bottleneck I have
			# parallelised only that part for now.
			async.series [
				(cb) ->
					async.eachSeries uploadedDocs, storeDoc, cb
				(cb) ->
					async.eachSeries uploadedFiles, storeFile, cb
			], (err) ->
				return callback(err) if err?
				# set the main file if present
				mainFile = _.find uploadedDocs, (uploadResult) -> uploadResult.file.main
				if mainFile
					ProjectEntityUpdateHandler.setRootDoc project_id, mainFile.doc._id, callback
				else
					callback()

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
		else if file.agent == 'zotero'
			callback(null, {
				provider: 'zotero',
				v1_importer_id: file.agent_data.importer_id,
				format: file.agent_data.format
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
			readStream.pause()
			writeStream = fs.createWriteStream(pathOnDisk)

			onError = (error) ->
				logger.err {err: error}, "error writing URL to disk"
				readStream.resume()
				callback(error)

			readStream.on 'error', onError
			writeStream.on 'error', onError

			writeStream.on "finish", ->
				callback null, pathOnDisk

			readStream.on 'response', (response) ->
				if 200 <= response.statusCode < 300
					readStream.pipe(writeStream)
					readStream.resume()
				else
					error = new Error("Overleaf s3 returned non-success code: #{response.statusCode}")
					logger.error {err: error, options}, "overleaf s3 error"
					readStream.resume()
					return callback(error)

	_waitForV1HistoryExport: (v1_project_id, v1_importer_id, callback = (error, latest_ver_id) ->) ->
		ProjectImporter._checkV1HistoryExportStatus @_exportUrl(v1_project_id, v1_importer_id, "history"), 0, callback

	_checkV1HistoryExportStatus: (url, requestCount, callback = (error, latest_ver_id) ->) ->
		V1SharelatexApi.request {
			method: 'GET'
			url: url
		}, (error, res, status) ->
			return callback(error) if error?

			if !status?.exported
				error ?= new V1HistoryNotSyncedError('v1 history not synced')

			if error?
				logger.log {url, requestCount, error}, "error checking v1 history sync"
				if requestCount >= V1_HISTORY_SYNC_REQUEST_TIMES.length
					return callback(error)
				else
					interval = (V1_HISTORY_SYNC_REQUEST_TIMES[requestCount + 1] - V1_HISTORY_SYNC_REQUEST_TIMES[requestCount]) * 1000
					setTimeout(
						() -> ProjectImporter._checkV1HistoryExportStatus url, requestCount + 1, callback
						interval
					)
			else
				callback(null, status)

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

	_confirmExport: (v1_project_id, v2_project_id, v1_importer_id, callback = (error) ->) ->
		V1SharelatexApi.request {
			method: 'POST'
			url: @_exportUrl(v1_project_id, v1_importer_id, "confirm")
			json:
				doc: { v2_project_id }
		}, (error, res) ->
			if error?
				callback(error)
			else
				callback()

	_cancelExport: (v1_project_id, v1_importer_id, callback = (error) ->) ->
		V1SharelatexApi.request {
			method: 'POST'
			url: @_exportUrl(v1_project_id, v1_importer_id, "cancel")
		}, (error, res) ->
			if error?
				callback(error)
			else
				callback()

	_exportUrl: (v1_project_id, v1_importer_id, action) ->
		"#{settings.apis.v1.url}/api/v1/sharelatex/users/#{v1_importer_id}/docs/#{v1_project_id}/export/#{action}"
