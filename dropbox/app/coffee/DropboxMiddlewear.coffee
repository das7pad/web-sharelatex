DropboxHandler = require "./DropboxHandler"
logger = require "logger-sharelatex"

module.exports = DropboxMiddlewear =
	injectUserSettings: (req, res, next) ->
		if !req.session.user?
			return next()
		user_id = req.session.user._id
		DropboxHandler.getUserRegistrationStatus user_id, (error, status) ->
			logger.log status: status, "got dropbox status"
			if error?
				logger.error err: error, user_id: user_id, "error getting dropbox sync status"
			res.locals.dropbox = {
				error: !!error
				registered: status?.registered
			}
			next()
