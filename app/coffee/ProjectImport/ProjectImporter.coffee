logger = require "logger-sharelatex"
settings = require "settings-sharelatex"
oAuthRequest = require "../OAuth/OAuthRequest"
Path = require "path"
uuid = require "uuid"
_ = require "underscore"
async = require "async"
fs = require "fs"
request = require "request"

ProjectCreationHandler = require "../../../../../app/js/Features/Project/ProjectCreationHandler"
ProjectEntityHandler = require "../../../../../app/js/Features/Project/ProjectEntityHandler"
{User} = require "../../../../../app/js/models/User"

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
			ProjectImporter._initSlProject user_id, doc, (error, project) ->
				return callback(error) if error?
				project_id = project._id
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
				logger.log {doc}, "got doc for project from overleaf"
				return callback(null, doc)

	_initSlProject: (user_id, doc = {}, callback = (err, project) ->) ->
		if !doc.title? or !doc.id? or !doc.version? or !doc.latex_engine?
			return callback(new Error("expected doc title, id, version and latex_engine"))
		ProjectCreationHandler.createBlankProject user_id, doc.title, (err, project) ->
			return callback(error) if error?
			project.overleaf.id = doc.id
			project.overleaf.imported_at_version = doc.version
			if ENGINE_TO_COMPILER_MAP[doc.latex_engine]?
				project.compiler = ENGINE_TO_COMPILER_MAP[doc.latex_engine]
			project.save (error) ->
				return callback(error) if error?
				return callback(null, project)

	_importFiles: (project_id, files = [], callback = (error) ->) ->
		async.mapSeries files,
			(file, cb) -> ProjectImporter._importFile project_id, file, cb
			callback

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
				logger.warn {type: file.type, path: file.file}, "unknown file type"
				callback()

	_writeUrlToDisk: (url, callback = (error, pathOnDisk) ->) ->
			callback = _.once(callback)

			pathOnDisk = "#{settings.path.dumpFolder}/#{uuid.v4()}"

			readStream = request.get url
			writeStream = fs.createWriteStream(pathOnDisk)
			readStream.pipe(writeStream)

			onError = (error) ->
				logger.err {err: error}, "error writing URL to disk"
				callback(error)

			readStream.on 'error', onError
			writeStream.on 'error', onError

			writeStream.on "finish", ->
				callback null, pathOnDisk
