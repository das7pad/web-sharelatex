logger = require "logger-sharelatex"
ProjectImporter = require "./ProjectImporter"
AuthenticationController = require "../../../../../app/js/Features/Authentication/AuthenticationController"

module.exports = ProjectImportController =
	importProject: (req, res, next) ->
		{ol_project_id} = req.params
		user_id = AuthenticationController.getLoggedInUserId req
		logger.log {user_id, ol_project_id}, "importing project from overleaf"
		ProjectImporter.importProject ol_project_id, user_id, (error, sl_project_id) ->
			return next(error) if error?
			res.redirect "/project/#{sl_project_id}"