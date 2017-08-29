logger = require "logger-sharelatex"
settings = require "settings-sharelatex"
Path = require "path"
uuid = require "uuid"
_ = require "underscore"
async = require "async"
fs = require "fs"
request = require "request"

oAuthRequest = require "../OAuth/OAuthRequest"
UserMapper = require "../OverleafUsers/UserMapper"

ProjectCreationHandler = require "../../../../../app/js/Features/Project/ProjectCreationHandler"
ProjectEntityHandler = require "../../../../../app/js/Features/Project/ProjectEntityHandler"
{User} = require "../../../../../app/js/models/User"
{ProjectInvite} = require "../../../../../app/js/models/ProjectInvite"
CollaboratorsHandler = require "../../../../../app/js/Features/Collaborators/CollaboratorsHandler"
PrivilegeLevels = require "../../../../../app/js/Features/Authorization/PrivilegeLevels"

ENGINE_TO_COMPILER_MAP = {
	latex_dvipdf: "latex"
	pdflatex:     "pdflatex"
	xelatex:      "xelatex"
	lualatex:     "lualatex"
}

module.exports = ProjectImporter =
	importProject: (ol_doc_id, user_id, callback = (error, project_id) ->) ->
		logger.log {ol_doc_id, user_id}, "importing project from overleaf"
		ProjectImporter._getOverleafDoc ol_doc_id, user_id, (error, doc) ->
			return callback(error) if error?
			ProjectImporter._initSharelatexProject user_id, doc, (error, project) ->
				return callback(error) if error?
				project_id = project._id
				ProjectImporter._importInvites project_id, doc.invites, (error) ->
					return callback(error) if error?
					ProjectImporter._importFiles project_id, doc.files, (error) ->
						return callback(error) if error?
						logger.log {project_id, ol_doc_id, user_id}, "finished project import"
						callback null, project_id

	_getOverleafDoc: (ol_doc_id, user_id, callback = (error, doc) ->) ->
		User.findOne { "_id": user_id }, { overleaf: true }, (error, user) ->
			return callback(error) if error?
			return callback(new Error("user not found")) if !user?
			oAuthRequest user, {
				url: "#{settings.overleaf.host}/api/v1/sharelatex/docs/#{ol_doc_id}"
				method: "GET"
				json: true
			}, (error, doc) ->
				return callback(error) if error?
				logger.log {ol_doc_id, user_id, doc}, "got doc for project from overleaf"
				return callback(null, doc)

	_initSharelatexProject: (user_id, doc = {}, callback = (err, project) ->) ->
		if !doc.title? or !doc.id? or !doc.latest_ver_id? or !doc.latex_engine?
			return callback(new Error("expected doc title, id, latest_ver_id and latex_engine"))
		ProjectCreationHandler.createBlankProject user_id, doc.title, (err, project) ->
			return callback(error) if error?
			project.overleaf.id = doc.id
			project.overleaf.imported_at_ver_id = doc.latest_ver_id
			if ENGINE_TO_COMPILER_MAP[doc.latex_engine]?
				project.compiler = ENGINE_TO_COMPILER_MAP[doc.latex_engine]
			project.save (error) ->
				return callback(error) if error?
				return callback(null, project)

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

	_importFiles: (project_id, files = [], callback = (error) ->) ->
		async.mapSeries(files, (file, cb) ->
			ProjectImporter._importFile project_id, file, cb
		, callback)

	_importFile: (project_id, file, callback = (error) ->) ->
		if !file.type? or !file.file?
			return callback(new Error("expected file.file and type"))
		path = "/" + file.file
		dirname = Path.dirname(path)
		name = Path.basename(path)
		logger.log {path: file.file, project_id, dirname, name, type: file.type}, "importing file"
		ProjectEntityHandler.mkdirp project_id, dirname, (error, folders, lastFolder) ->
			return callback(error) if error?
			folder_id = lastFolder._id
			if file.type == "src"
				if !file.latest_content?
					return callback(new Error("expected file.latest_content"))
				ProjectEntityHandler.addDoc project_id, folder_id, name, file.latest_content.split("\n"), (error, doc) ->
					return callback(error) if error?
					if file.main
						ProjectEntityHandler.setRootDoc project_id, doc._id, callback
					else
						callback()
			else if file.type == "att"
				if !file.file_path?
					return callback(new Error("expected file.file_path"))
				url = "#{settings.overleaf.s3.host}/#{file.file_path}"
				ProjectImporter._writeUrlToDisk url, (error, pathOnDisk) ->
					return callback(error) if error?
					ProjectEntityHandler.addFile project_id, folder_id, name, pathOnDisk, callback
			else
				logger.warn {type: file.type, path: file.file, project_id}, "unknown file type"
				callback()

	_writeUrlToDisk: (url, callback = (error, pathOnDisk) ->) ->
			callback = _.once(callback)

			pathOnDisk = "#{settings.path.dumpFolder}/#{uuid.v4()}"

			readStream = request.get url
			writeStream = fs.createWriteStream(pathOnDisk)

			onError = (error) ->
				logger.err {err: error}, "error writing URL to disk"
				callback(error)

			readStream.on 'error', onError
			writeStream.on 'error', onError

			writeStream.on "finish", ->
				callback null, pathOnDisk

			readStream.pipe(writeStream)
