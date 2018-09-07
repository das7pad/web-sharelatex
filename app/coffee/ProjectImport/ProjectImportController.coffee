logger = require "logger-sharelatex"
ProjectImporter = require "./ProjectImporter"
AuthenticationController = require "../../../../../app/js/Features/Authentication/AuthenticationController"
{
	UnsupportedFileTypeError,
	UnsupportedBrandError,
	UnsupportedExportRecordsError
	InvalidNameError
} = require "../../../../../app/js/Features/Errors/Errors"
{
	V2ExportCompleted,
	V2ExportInProgress,
	V2ExportNotInProgress,
} = require "./Errors"

module.exports = ProjectImportController =
	importProject: (req, res) ->
		{ol_doc_id} = req.params
		user_id = AuthenticationController.getLoggedInUserId req
		logger.log {user_id, ol_doc_id}, "importing project from overleaf"
		unsupportedError = (msg) -> res.status(501).json(message: msg)
		ProjectImporter.importProject ol_doc_id, user_id, (error, sl_project_id) ->
			if error instanceof UnsupportedFileTypeError
				unsupportedError("Sorry! Projects with linked or external files aren't fully supported yet.")
			else if error instanceof UnsupportedBrandError
				unsupportedError("Sorry! Projects with associated journals aren't supported yet.")
			else if error instanceof UnsupportedExportRecordsError
				unsupportedError("Sorry! Projects with an ongoing export aren't supported yet.")
			else if error instanceof V2ExportInProgress
				unsupportedError("Sorry! This Project is already being exported")
			else if error instanceof V2ExportNotInProgress
				unsupportedError("Sorry! This export timed out")
			else if error instanceof V2ExportCompleted
				res.json({ redir: "/project/#{error.v2_project_id}" })
			else if error instanceof InvalidNameError
				unsupportedError("Sorry! #{error.message}, please rename your project and try again")
			else if error?
				unsupportedError("Sorry! There was a problem with your import, please try again")
			else
				res.json({ redir: "/project/#{sl_project_id}" })
