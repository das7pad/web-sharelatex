V2ExportCompleted = (message, error_data) ->
	error = new Error(message)
	error.name = "V2ExportCompleted"
	error.v2_project_id = error_data.v2_project_id
	error.__proto__ = V2ExportCompleted.prototype
	return error
V2ExportCompleted.prototype.__proto__ = Error.prototype

V2ExportInProgress = (message) ->
	error = new Error(message)
	error.name = "V2ExportInProgress"
	error.__proto__ = V2ExportInProgress.prototype
	return error
V2ExportInProgress.prototype.__proto__ = Error.prototype

V2ExportNotInProgress = (message) ->
	error = new Error(message)
	error.name = "V2ExportNotInProgress"
	error.__proto__ = V2ExportNotInProgress.prototype
	return error
V2ExportNotInProgress.prototype.__proto__ = Error.prototype

V1ExportInProgress = (message) ->
	error = new Error(message)
	error.name = "V1ExportInProgress"
	error.__proto__ = V1ExportInProgress.prototype
	return error
V1ExportInProgress.prototype.__proto__ = Error.prototype

V1ProjectHasAssignments = (message) ->
	error = new Error(message)
	error.name = "V1ProjectHasAssignments"
	error.__proto__ = V1ProjectHasAssignments.prototype
	return error
V1ProjectHasAssignments.prototype.__proto__ = Error.prototype

IMPORT_ERRORS = {
	1: V2ExportCompleted,
	2: V2ExportInProgress,
	3: V2ExportNotInProgress,
	4: V1ExportInProgress,
	5: V1ProjectHasAssignments
}

module.exports = Errors =
	V2ExportCompleted: V2ExportCompleted
	V2ExportInProgress: V2ExportInProgress
	V2ExportNotInProgress: V2ExportNotInProgress
	V1ExportInProgress: V1ExportInProgress
	V1ProjectHasAssignments: V1ProjectHasAssignments

	fromErrorCode: (error_code, message, error_data) ->
		errorClass = IMPORT_ERRORS[error_code] || Error
		new errorClass(message, error_data)
