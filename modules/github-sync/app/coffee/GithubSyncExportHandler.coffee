ProjectEntityHandler = require "../../../../app/js/Features/Project/ProjectEntityHandler"
DocumentUpdaterHandler = require "../../../../app/js/Features/DocumentUpdater/DocumentUpdaterHandler"
ProjectGetter = require("../../../../app/js/Features/Project/ProjectGetter")
GithubSyncApiHandler = require "./GithubSyncApiHandler"
settings = require "settings-sharelatex"

module.exports = GithubSyncExportHandler =
	exportProject: (project_id, options, callback = (error) ->) ->
		ProjectGetter.getProject project_id, {owner_ref: 1}, (error, project) ->
			return callback(error) if error?
			DocumentUpdaterHandler.flushProjectToMongo project_id, (error) ->
				return callback(error) if error?
				GithubSyncExportHandler._buildFileList project_id, (error, files) ->
					return callback(error) if error?
					GithubSyncApiHandler.exportProject project_id, project.owner_ref, options, files, callback
					
	mergeProject: (project_id, options, callback = (error) ->) ->
		DocumentUpdaterHandler.flushProjectToMongo project_id, (error) ->
			return callback(error) if error?
			GithubSyncExportHandler._buildFileList project_id, (error, files) ->
				return callback(error) if error?
				GithubSyncApiHandler.mergeProject project_id, options, files, callback
		
	_buildFileList: (project_id, callback = (error, files) ->) ->
		# This shares similar code with Features/Compile/ClsiManager.coffee#_buildRequest
		# Consider refactoring out shared logic?
		fileList = []
		ProjectEntityHandler.getAllDocs project_id, (error, docs = {}) ->
			return callback(error) if error?
			ProjectEntityHandler.getAllFiles project_id, (error, files = {}) ->
				return callback(error) if error?
				
				for path, doc of docs
					fileList.push {
						path:    path.replace(/^\//, "") # Remove leading /
						content: doc.lines.join("\n")
						id:      doc._id.toString()
						rev:     doc.rev
					}
				
				for path, file of files
					fileList.push {
						path: path.replace(/^\//, "") # Remove leading /
						url:  "#{settings.apis.filestore.url}/project/#{project_id}/file/#{file._id}"
						id:   file._id.toString()
						rev:  file.rev
					}
				
				callback null, fileList
		
