UserGetter = require('../../../../../app/js/Features/User/UserGetter')
SubscriptionUpdater = require('../../../../../app/js/Features/Subscription/SubscriptionUpdater')
Settings = require('settings-sharelatex')
request = require('request')
logger = require('logger-sharelatex')


module.exports = AccountSyncManager =

	doSync: (overleafUserId, callback=(err)->) ->
		logger.log {overleafUserId}, "[AccountSync] starting account sync"
		UserGetter.getUser {'overleaf.id': overleafUserId}, {_id: 1}, (err, user) ->
			if err?
				logger.err {overleafUserId}, "[AccountSync] error getting user"
				return callback(err)
			if !user?._id?
				err = new Error("no user found for overleaf id")
				logger.log {overleafUserId}, "[AccountSync] #{err.message}"
				return callback(err)
			logger.log {overleafUserId, userId: user._id},
				"[AccountSync] updating user subscription and features"
			SubscriptionUpdater.refreshSubscription user._id, callback

	# planCode = 'ol_pro' | 'ol_pro_plus' | null
	# For this to work, we need plans in settings with plan-codes:
	#   - 'ol_pro'
	#   - 'ol_pro_plus'
	getPlanCodeFromOverleaf: (userId, callback=(err, planCode)->) ->
		logger.log {userId}, "[AccountSync] fetching overleaf plan for user"
		UserGetter.getUser userId, {'overleaf.id': 1}, (err, user) ->
			return callback(err) if err?
			overleafId = user?.overleaf?.id
			if !overleafId?
				logger.log {userId}, "[AccountSync] no overleaf id found for user"
				return callback(null, null)
			AccountSyncManager._overleafPlanRequest overleafId, (err, response, body) ->
				return callback(err) if err?
				if response.statusCode != 200
					err = new Error("Got non-200 response from overleaf: #{response.statusCode}")
					logger.err {err, userId, overleafId},
						"[AccountSync] got non-200 response from overleaf"
					return callback(err)
				planName = body.plan_name
				if planName
					planName = "ol_#{planName}"
				return callback(null, planName)

	_overleafPlanRequest: (overleafId, callback=(err, response, body)->) ->
		opts = {
			uri: "#{Settings.overleaf.host}/api/v1/sharelatex/users/#{overleafId}/details"
			method: 'GET'
			json: true
			timeout: 5 * 1000
		}
		if Settings.overleaf?.basicAuth?.username
			opts.auth = {
				user: Settings.overleaf.basicAuth.username
				pass: Settings.overleaf.basicAuth.password
			}
		request opts, callback
