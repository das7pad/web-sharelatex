module.exports = GithubSyncMiddlewear =
	injectUserSettings: (req, res, next) ->
		# TODO: Load this from the github sync api eventually
		res.locals.github = {
			enabled: true
		}
		next()