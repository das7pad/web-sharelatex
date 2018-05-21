UserGetter = require('../../../../../app/js/Features/User/UserGetter')
FeaturesUpdater = require('../../../../../app/js/Features/Subscription/FeaturesUpdater')
logger = require('logger-sharelatex')


module.exports = AccountSyncManager =

	doSync: (v1UserId, callback=(err)->) ->
		logger.log {v1UserId}, "[AccountSync] starting account sync"
		UserGetter.getUser {'overleaf.id': v1UserId}, {_id: 1}, (err, user) ->
			if err?
				logger.err {v1UserId}, "[AccountSync] error getting user"
				return callback(err)
			if !user?._id?
				logger.warn {v1UserId}, "[AccountSync] no user found for v1 id"
				return callback(null)
			logger.log {v1UserId, userId: user._id},
				"[AccountSync] updating user subscription and features"
			FeaturesUpdater.refreshFeatures user._id, callback

