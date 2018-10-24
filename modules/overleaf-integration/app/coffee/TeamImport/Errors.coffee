UserNotFoundError = (message) ->
	error = new Error(message)
	error.name = "UserNotFoundError"
	error.__proto__ = UserNotFoundError.prototype
	return error
UserNotFoundError.prototype.__proto__ = Error.prototype

MultipleSubscriptionsError = (message) ->
	error = new Error(message)
	error.name = "MultipleSubscriptionsError"
	error.__proto__ = MultipleSubscriptionsError.prototype
	return error
MultipleSubscriptionsError.prototype.__proto__ = Error.prototype

module.exports = Errors =
	MultipleSubscriptionsError: MultipleSubscriptionsError
	UserNotFoundError: UserNotFoundError
