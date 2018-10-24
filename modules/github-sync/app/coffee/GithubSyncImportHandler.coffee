ProjectCreationHandler = require "../../../../app/js/Features/Project/ProjectCreationHandler"
ProjectRootDocManager = require "../../../../app/js/Features/Project/ProjectRootDocManager"

GithubSyncApiHandler = require "./GithubSyncApiHandler"

module.exports = GithubSyncImportHandler =
	importProject: (owner_id, name, repo, callback = (error, project_id) ->) ->
		ProjectCreationHandler.createBlankProject owner_id, name, (error, project) ->
			return callback(error) if error?
			project_id = project._id.toString()
			GithubSyncApiHandler.importProject project_id, owner_id, repo, (error) ->
				return callback(error) if error?
				ProjectRootDocManager.setRootDocAutomatically project_id, (error) ->
					return callback(error) if error?
					callback null, project_id