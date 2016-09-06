GithubSyncApiHandler = require "./GithubSyncApiHandler"
AuthenticationController = require('../../../../app/js/Features/Authentication/AuthenticationController')
logger = require "logger-sharelatex"

module.exports = GithubSyncMiddlewear =
	injectUserSettings: (req, res, next) ->
		if !AuthenticationController.isUserLoggedIn(req)?
			return next()
		user_id = AuthenticationController.getLoggedInUserId(req)
		GithubSyncApiHandler.getUserStatus user_id, (error, status) ->
			logger.log status: status, enabled: status?.enabled, "got github status"
			if error?
				logger.error err: error, user_id: user_id, "error getting github sync status"
			res.locals.github = {
				error: !!error
				enabled: status?.enabled
			}
			next()
