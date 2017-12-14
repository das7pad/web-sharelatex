UserGetter = require('../../../../../app/js/Features/User/UserGetter')
SubscriptionUpdater = require('../../../../../app/js/Features/Subscription/SubscriptionUpdater')
Settings = require('settings-sharelatex')
oAuthRequest = require('../OAuth/OAuthRequest')
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

	# Returned planCode = 'v1_pro' | 'v1_pro_plus' | 'v1_student' | null
	# For this to work, we need plans in settings with plan-codes:
	#   - 'v1_pro'
	#   - 'v1_pro_plus'
	#   - 'v1_student'
	getPlanCodeFromOverleaf: (userId, callback=(err, planCode)->) ->
		logger.log {userId}, "[AccountSync] fetching overleaf plan for user"
		UserGetter.getUser userId, {'overleaf.id': 1}, (err, user) ->
			return callback(err) if err?
			overleafId = user?.overleaf?.id
			if !overleafId?
				logger.log {userId}, "[AccountSync] no overleaf id found for user"
				return callback(null, null)
			AccountSyncManager._overleafPlanRequest userId, overleafId, (err, body) ->
				return callback(err) if err?
				planName = body.plan_name
				if planName in ['pro', 'pro_plus', 'student']
					planName = "v1_#{planName}"
				else
					# Throw away 'anonymous', 'free', etc as being equivalent to null
					planName = null
				return callback(null, planName)

	_overleafPlanRequest: (userId, overleafId, callback=(err, body)->) ->
		oAuthRequest userId, {
			url: "#{Settings.overleaf.host}/api/v1/sharelatex/users/current_user/plan_code"
			method: 'GET'
			json: true
			timeout: 5 * 1000
		}, callback
