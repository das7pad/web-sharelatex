UserGetter = require('../../../../../app/js/Features/User/UserGetter')
FeaturesUpdater = require('../../../../../app/js/Features/Subscription/FeaturesUpdater')
SubscriptionLocator = require('../../../../../app/js/Features/Subscription/SubscriptionLocator')
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
			FeaturesUpdater.refreshFeatures user._id, false, callback

	getV2PlanCode: (v1_user_id, callback = (error, planCode) ->) ->
		UserGetter.getUser {'overleaf.id': v1_user_id}, {_id: 1}, (error, user) ->
			return callback(error) if error?
			if !user?
				return callback null, null
			user_id = user._id
			logger.log {v1_user_id, user_id}, "[AccountSync] found v2 user for v1 id"
			SubscriptionLocator.getUsersSubscription user_id, (error, individualSubscription) ->
				return callback(error) if error?
				SubscriptionLocator.getGroupSubscriptionsMemberOf user_id, (error, groupSubscriptions = []) ->
					return callback(error) if error?
					subscriptions = []
					if individualSubscription?
						subscriptions.push individualSubscription
					subscriptions = subscriptions.concat groupSubscriptions
					planCodes = subscriptions.map (s) -> AccountSyncManager._canonicalPlanCode(s.planCode)
					planCodes = AccountSyncManager._sortPlanCodes(planCodes)
					bestPlanCode = planCodes[0] or 'personal'
					logger.log {v1_user_id, user_id, planCodes, bestPlanCode, individualSubscription, groupSubscriptions, subscriptions}, "[AccountSync] found plans for user"
					callback null, bestPlanCode

	_canonicalPlanCode: (planCode) ->
		# Takes a plan_code like 'collaborator_7_day_trial' and returns
		# a canonical type like 'collaborator'
		MATCHES = {
			personal: 'personal',
			stud: 'student'
			coll: 'collaborator'
			prof: 'professional'
			group: 'professional'
		}
		for match, canonicalPlanCode of MATCHES
			if planCode.match(match)
				return canonicalPlanCode
		return 'personal'

	_sortPlanCodes: (planCodes) ->
		PLAN_CODE_RANKS = ['professional', 'collaborator', 'student', 'personal']
		return planCodes.sort (a,b) => PLAN_CODE_RANKS.indexOf(a) - PLAN_CODE_RANKS.indexOf(b)
