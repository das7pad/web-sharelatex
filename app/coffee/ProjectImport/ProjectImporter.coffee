logger = require "logger-sharelatex"
settings = require "settings-sharelatex"
oAuthRequest = require "../OAuth/OAuthRequest"
Path = require "path"
uuid = require "uuid"
_ = require "underscore"
async = require "async"
fs = require "fs"

ProjectCreationHandler = require "../../../../../app/js/Features/Project/ProjectCreationHandler"
ProjectEntityHandler = require "../../../../../app/js/Features/Project/ProjectEntityHandler"
{User} = require "../../../../../app/js/models/User"

module.exports = ProjectImporter =
	importProject: (ol_project_id, user_id, callback = (error, sl_project_id) ->) ->
		console.log "IMPORTING PROJET"
		User.findOne { "_id": user_id }, { overleaf: true }, (error, user) ->
			return callback(error) if error?
			return callback(new Error("user not found")) if !user?
			console.log "FOUND USER, making request"
			oAuthRequest user, {
				url: "#{settings.overleaf.host}/api/v1/sharelatex/docs/#{ol_project_id}"
				method: "GET"
				json: true
			}, (error, doc) ->
				return callback(error) if error?
				logger.log {doc}, "got doc for project from overleaf"
				ProjectCreationHandler.createBlankProject user_id, doc.title, (err, project) ->
					return callback(error) if error?
					sl_project_id = project._id
					project.overleaf.id = doc.id
					project.overleaf.imported_at_version = doc.version
					project.save (error) ->
						return callback(error) if error?
						async.mapSeries doc.files,
							(file, cb) -> ProjectImporter._importFile sl_project_id, file, cb
							(error) ->
								return callback(error) if error?
								logger.log {sl_project_id, ol_project_id, user_id}, "finished project import"
								callback null, sl_project_id
					
	
	_importFile: (sl_project_id, file, callback = (error) ->) ->
		path = "/" + file.file
		dirname = Path.dirname(path)
		name = Path.basename(path)
		logger.log {path: file.file, sl_project_id, dirname, name, type: file.type}, "importing file"
		ProjectEntityHandler.mkdirp sl_project_id, dirname, (error, folders, lastFolder) ->
			return callback(error) if error?
			folder_id = lastFolder._id
			if file.type == "src"
				ProjectEntityHandler.addDoc sl_project_id, folder_id, name, file.latest_content.split("\n"), callback
			else if file.type == "att"
				url = "#{settings.overleaf.s3.host}/#{file.file_path}"
				ProjectImporter._writeUrlToDisk url, (error, pathOnDisk) ->
					return callback(error) if error?
					ProjectEntityHandler.addFile sl_project_id, folder_id, name, pathOnDisk, callback
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
# 
# ProjectImporter.importProject "243ftrddtmzxkyy", "59958d4dcf11ae281afb5334", "55e1e5ca5ac646cf51a1aeebee68fbd8448cc97af2801c97f9c0e754ec57cc8b", (error, sl_project_id) ->
# 	throw error if error?
# 	console.log "IMPORTED: #{sl_project_id}"
# 	process.exit()