GithubSyncApiHandler = require "./GithubSyncApiHandler"
logger = require "logger-sharelatex"

module.exports = GithubSyncMiddlewear =
	injectUserSettings: (req, res, next) ->
		user_id = req.session.user._id
		GithubSyncApiHandler.getStatus user_id, (error, status) ->
			logger.log status: status, enabled: status.enabled, "getting github status"
			if error?
				logger.error err: error, user_id: user_id, "error getting github sync status"
			res.locals.github = {
				error: !!error
				enabled: status?.enabled
			}
			next()