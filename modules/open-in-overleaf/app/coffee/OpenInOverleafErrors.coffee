MissingParametersError = (message) ->
	error = new Error(message)
	error.name = "MissingParametersError"
	error.__proto__ = MissingParametersError.prototype
	return error
MissingParametersError.prototype.__proto__ = Error.prototype

ZipExtractError = (message) ->
	error = new Error(message)
	error.name = "ZipExtractError"
	error.__proto__ = ZipExtractError.prototype
	return error
ZipExtractError.prototype.__proto__ = Error.prototype

InvalidFileTypeError = (message) ->
	error = new Error(message)
	error.name = "InvalidFileTypeError"
	error.__proto__ = InvalidFileTypeError.prototype
	return error
InvalidFileTypeError.prototype.__proto__ = Error.prototype

PublisherNotFoundError = (message) ->
	error = new Error(message)
	error.name = "PublisherNotFoundError"
	error.__proto__ = PublisherNotFoundError.prototype
	return error
PublisherNotFoundError.prototype.__proto__ = Error.prototype

module.exports = OpenInOverleafErrors =
	MissingParametersError: MissingParametersError
	ZipExtractError: ZipExtractError
	InvalidFileTypeError: InvalidFileTypeError
	PublisherNotFoundError: PublisherNotFoundError
