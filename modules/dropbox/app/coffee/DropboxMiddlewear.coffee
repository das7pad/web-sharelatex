DropboxHandler = require "./DropboxHandler"
logger = require "logger-sharelatex"
AuthenticationController = require "../../../../app/js/Features/Authentication/AuthenticationController"

module.exports = DropboxMiddlewear =
	injectUserSettings: (req, res, next) ->
		if !AuthenticationController.isUserLoggedIn(req)?
			return next()
		user_id = AuthenticationController.getLoggedInUserId(req)
		DropboxHandler.getUserRegistrationStatus user_id, (error, status) ->
			logger.log status: status, "got dropbox status"
			if error?
				logger.error err: error, user_id: user_id, "error getting dropbox sync status"
			res.locals.dropbox = {
				error: !!error
				registered: status?.registered
			}
			next()
