logger = require "logger-sharelatex"
ProjectImporter = require "./ProjectImporter"
AuthenticationController = require "../../../../../app/js/Features/Authentication/AuthenticationController"
{UnsupportedFileTypeError} = require "../../../../../app/js/Features/Errors/Errors"

module.exports = ProjectImportController =
	importProject: (req, res) ->
		{ol_doc_id} = req.params
		user_id = AuthenticationController.getLoggedInUserId req
		logger.log {user_id, ol_doc_id}, "importing project from overleaf"
		ProjectImporter.importProject ol_doc_id, user_id, (error, sl_project_id) ->
			if error? && error instanceof UnsupportedFileTypeError
				return res.status(501).json({
					message: "Sorry! Projects with linked or external files aren't supported yet."
				})
			res.json({ redir: "/project/#{sl_project_id}" })