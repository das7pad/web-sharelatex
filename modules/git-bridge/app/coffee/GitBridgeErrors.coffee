util = require 'util'


Errors = {}


defineError = (name) ->
	errorFn = (message) ->
		Error.captureStackTrace(this, errorFn)
		@name = name
		@message = message
	util.inherits errorFn, Error
	Errors[name] = errorFn


defineError('ProjectNotCompatibleError')
defineError('OutOfDateError')
defineError('InvalidFileError')


module.exports = Errors
