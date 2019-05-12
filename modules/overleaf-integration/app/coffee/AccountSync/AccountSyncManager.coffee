UserGetter = require('../../../../../app/js/Features/User/UserGetter')
FeaturesUpdater = require('../../../../../app/js/Features/Subscription/FeaturesUpdater')
SubscriptionLocator = require('../../../../../app/js/Features/Subscription/SubscriptionLocator')
InstitutionsFeatures = require('../../../../../app/js/Features/Institutions/InstitutionsFeatures')
logger = require('logger-sharelatex')
Errors = require "../../../../../app/js/Features/Errors/Errors"

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

	_getV2Subscriptions: (v1_user_id, callback = (error, individualSubscription, groupSubscriptions) ->) ->
		UserGetter.getUser {'overleaf.id': v1_user_id}, {_id: 1}, (error, user) ->
			return callback(error) if error?
			if !user?
				return callback new Errors.NotFoundError('no v1 user found')
			user_id = user._id
			logger.log {v1_user_id, user_id}, "[AccountSync] found v2 user for v1 id"
			SubscriptionLocator.getUsersSubscription user_id, (error, individualSubscription) ->
				return callback(error) if error?
				SubscriptionLocator.getGroupSubscriptionsMemberOf user_id, (error, groupSubscriptions = []) ->
					return callback(error) if error?
					callback(null, individualSubscription, groupSubscriptions)

	_getV2SubscriptionsPlans: (v1_user_id, callback = (error, plans) ->) ->
		AccountSyncManager._getV2Subscriptions v1_user_id, (error, individualSubscription, groupSubscriptions = []) ->
			return callback(error) if error?
			subscriptions = []
			subscriptions.push individualSubscription if individualSubscription?
			subscriptions = subscriptions.concat groupSubscriptions
			planCodes = subscriptions.map (s) -> AccountSyncManager._canonicalPlanCode(s.planCode)
			logger.log {v1_user_id, planCodes, individualSubscription, groupSubscriptions}, "[AccountSync] found v2 subscriptions for user"
			callback(null, planCodes)

	_getInstitutionsPlan: (v1_user_id, callback = (error, plan) ->) ->
		UserGetter.getUser {'overleaf.id': v1_user_id}, {_id: 1}, (error, user) ->
			return callback(error) if error?
			return callback new Errors.NotFoundError('no v1 user found') unless user?
			InstitutionsFeatures.getInstitutionsPlan user._id, (error, planCode) ->
				logger.log {v1_user_id, planCode}, "[AccountSync] found institution plan code for user"
				callback(error, planCode)

	getV2PlanCode: (v1_user_id, callback = (error, planCode) ->) ->
		AccountSyncManager._getV2SubscriptionsPlans v1_user_id, (error, v2SubscriptionsPlans) ->
			return callback(error) if error?
			AccountSyncManager._getInstitutionsPlan v1_user_id, (error, institutionsPlan) ->
				return callback(error) if error?
				planCodes = v2SubscriptionsPlans
				planCodes.push AccountSyncManager._canonicalPlanCode(institutionsPlan) if institutionsPlan?

				planCodes = AccountSyncManager._sortPlanCodes(planCodes)
				bestPlanCode = planCodes[0] or 'personal'
				logger.log {v1_user_id, planCodes, bestPlanCode}, "[AccountSync] found plans for user"
				callback null, bestPlanCode

	getV2SubscriptionStatus: (v1_user_id, callback = (error, planCode) ->) ->
		AccountSyncManager._getV2Subscriptions v1_user_id, (error, individualSubscription, groupSubscriptions = []) ->
			return callback(error) if error?
			callback null, {
				has_subscription: individualSubscription?
				in_team: groupSubscriptions.length > 0
			}

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
		return MATCHES.personal if !planCode?
		for match, canonicalPlanCode of MATCHES
			if planCode.match(match)
				return canonicalPlanCode
		return 'personal'

	_sortPlanCodes: (planCodes) ->
		PLAN_CODE_RANKS = ['professional', 'collaborator', 'student', 'personal']
		return planCodes.sort (a,b) => PLAN_CODE_RANKS.indexOf(a) - PLAN_CODE_RANKS.indexOf(b)
