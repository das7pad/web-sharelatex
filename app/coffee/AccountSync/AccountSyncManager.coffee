UserGetter = require('../../../../../app/js/Features/User/UserGetter')
SubscriptionUpdater = require('../../../../../app/js/Features/Subscription/SubscriptionUpdater')
Settings = require('settings-sharelatex')
oAuthRequest = require('../OAuth/OAuthRequest')
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
			SubscriptionUpdater.refreshSubscription user._id, callback

	# Returned planCode = 'v1_pro' | 'v1_pro_plus' | 'v1_student' | null
	# For this to work, we need plans in settings with plan-codes:
	#   - 'v1_pro'
	#   - 'v1_pro_plus'
	#   - 'v1_student'
	getPlanCodeFromV1: (userId, callback=(err, planCode)->) ->
		logger.log {userId}, "[AccountSync] fetching v1 plan for user"
		UserGetter.getUser userId, {'overleaf.id': 1}, (err, user) ->
			return callback(err) if err?
			v1Id = user?.overleaf?.id
			if !v1Id?
				logger.log {userId}, "[AccountSync] no v1 id found for user"
				return callback(null, null)
			AccountSyncManager._v1PlanRequest userId, v1Id, (err, body) ->
				return callback(err) if err?
				planName = body.plan_name
				if planName in ['pro', 'pro_plus', 'student']
					planName = "v1_#{planName}"
				else
					# Throw away 'anonymous', 'free', etc as being equivalent to null
					planName = null
				return callback(null, planName)

	_v1PlanRequest: (userId, v1Id, callback=(err, body)->) ->
		oAuthRequest userId, {
			url: "#{Settings.overleaf.host}/api/v1/sharelatex/users/current_user/plan_code"
			method: 'GET'
			json: true
			timeout: 5 * 1000
		}, callback
