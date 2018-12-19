logger = require "logger-sharelatex"
ProjectImporter = require "./ProjectImporter"
ProjectImportErrorRecorder = require "./ProjectImportErrorRecorder"
WEB_PATH = "../../../../../app/js"
AuthenticationController = require "#{WEB_PATH}/Features/Authentication/AuthenticationController"
UserGetter = require "#{WEB_PATH}/Features/User/UserGetter"
HistoryController = require "#{WEB_PATH}/Features/History/HistoryController"
V1Api = require "#{WEB_PATH}/Features/V1/V1Api"
settings = require 'settings-sharelatex'
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

READ_AND_WRITE_TOKEN_REGEX = /(\d+)(\w+)/
READ_ONLY_TOKEN_REGEX = /[a-z]{12}/

module.exports = ProjectImportController =
	importProject: (req, res) ->
		res.setTimeout(5 * 60 * 1000) # allow extra time for the import to complete
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
				unsupportedError("Sorry! Projects with some associated journals aren't supported yet.")
			else if error instanceof V2ExportInProgress
				unsupportedError("Sorry! This Project is already being exported")
			else if error instanceof V2ExportNotInProgress
				unsupportedError("Sorry! This export timed out")
			else if error instanceof V1ProjectHasAssignments
				unsupportedError("Sorry! This project is being used as an assignment, and assignments are not supported in Overleaf v2. Please see https://www.overleaf.com/learn/how-to/Teaching_in_Overleaf_v2 for more information about teaching tools in Overleaf v2.")
			else if error instanceof InvalidNameError
				unsupportedError("Sorry! #{error.message}, please rename your project and try again")
			else if error instanceof V2ExportCompleted
				importCompleted({ redir: ProjectImportController._redirUrl(ol_doc_id) })
			else if error?
				unsupportedError("Sorry! There was a problem with your import, please try again")
			else
				importCompleted({ redir: ProjectImportController._redirUrl(ol_doc_id) })

	_redirUrl: (ol_doc_id) ->
		if READ_AND_WRITE_TOKEN_REGEX.test ol_doc_id
			"/#{ol_doc_id}"
		else if READ_ONLY_TOKEN_REGEX.test ol_doc_id
			"/read/#{ol_doc_id}"
		else
			throw new Error('unknown v1 token')

	getFailures: (req, res, next = (error) ->) ->
		ProjectImportErrorRecorder.getFailures (error, result) ->
			return next(error) if error?
			res.send {failures: result}

	downloadZip: (req, res, next) ->
		userId = AuthenticationController.getLoggedInUserId(req)
		{ol_doc_token} = req.params
		UserGetter.getUser userId, {overleaf: 1}, (err, user) ->
			return next(err) if err?
			v1_user_id = user.overleaf?.id
			return next(new Error('expected v1 id')) if !v1_user_id?
			ProjectImportController._startHistoryExport ol_doc_token, v1_user_id, (err, ol_doc_id) ->
				return next(err) if err?
				ProjectImportController._waitForHistoryExport ol_doc_token, v1_user_id, (err, history_export_version) ->
					return next(err) if err?
					HistoryController._pipeHistoryZipToResponse ol_doc_id, history_export_version, ol_doc_token, res, next

	_startHistoryExport: (ol_doc_token, v1_user_id, callback = (error) ->) ->
		V1Api.request {
			method: "POST",
			url: "/api/v1/sharelatex/users/#{v1_user_id}/docs/#{ol_doc_token}/history_export/start"
		}, (error, response, body) ->
			return callback(error) if error?
			return callback null, body.doc_id

	_waitForHistoryExport: (ol_doc_token, v1_user_id, callback = (error, history_export_version) ->) ->
		url = "#{settings.apis.v1.url}/api/v1/sharelatex/users/#{v1_user_id}/docs/#{ol_doc_token}/history_export/status"
		ProjectImporter._checkV1HistoryExportStatus url, 0, (error, data) ->
			return callback(error) if error?
			return callback null, data.history_export_version
