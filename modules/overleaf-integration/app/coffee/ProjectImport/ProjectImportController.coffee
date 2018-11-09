logger = require "logger-sharelatex"
ProjectImporter = require "./ProjectImporter"
ProjectImportErrorRecorder = require "./ProjectImportErrorRecorder"
AuthenticationController = require "../../../../../app/js/Features/Authentication/AuthenticationController"
{
	UnsupportedFileTypeError,
	UnsupportedExportRecordsError
	InvalidNameError
} = require "../../../../../app/js/Features/Errors/Errors"
{
	V2ExportCompleted,
	V2ExportInProgress,
	V2ExportNotInProgress,
	V1ExportInProgress,
	V1ProjectHasAssignments
} = require "./Errors"

module.exports = ProjectImportController =
	importProject: (req, res) ->
		{ol_doc_id} = req.params
		user_id = AuthenticationController.getLoggedInUserId req
		logger.log {user_id, ol_doc_id}, "importing project from overleaf"
		ProjectImporter.importProject ol_doc_id, user_id, (error, sl_project_id) ->
			recordFailure = (failure) ->
				ProjectImportErrorRecorder.record ol_doc_id, user_id, failure, (err, result) -> # record the error in the background
					# send metrics to graphite if a new project failed, or an existing failed project succeeded
					if result?.n > 0
						ProjectImportErrorRecorder.getFailures ->
			unsupportedError = (msg) ->
				res.status(501).json(message: msg)
				recordFailure(error)
			importCompleted = (result) ->
				res.json(result)
				recordFailure(null)
			if error instanceof UnsupportedFileTypeError
				unsupportedError("Sorry! Projects with linked or external files aren't fully supported yet.")
			else if error instanceof UnsupportedExportRecordsError
				unsupportedError("Sorry! Projects with an ongoing export aren't supported yet.")
			else if error instanceof V2ExportInProgress
				unsupportedError("Sorry! This Project is already being exported")
			else if error instanceof V2ExportNotInProgress
				unsupportedError("Sorry! This export timed out")
			else if error instanceof V1ProjectHasAssignments
				unsupportedError("Sorry! This project is being used as an assignment, and assignments are not supported in Overleaf v2. Please see https://www.overleaf.com/learn/how-to/Teaching_in_Overleaf_v2 for more information about teaching tools in Overleaf v2.")
			else if error instanceof InvalidNameError
				unsupportedError("Sorry! #{error.message}, please rename your project and try again")
			else if error instanceof V2ExportCompleted
				importCompleted({redir: "/project/#{error.v2_project_id}"})
			else if error?
				unsupportedError("Sorry! There was a problem with your import, please try again")
			else
				importCompleted({ redir: "/project/#{sl_project_id}" })

	getFailures: (req, res, next = (error) ->) ->
		ProjectImportErrorRecorder.getFailures (error, result) ->
			return next(error) if error?
			res.send {failures: result}
