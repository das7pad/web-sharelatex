logger = require('logger-sharelatex')
AccountSyncManager = require './AccountSyncManager'
AuthenticationController = require "../../../../../app/js/Features/Authentication/AuthenticationController"
UserGetter = require('../../../../../app/js/Features/User/UserGetter')
settings = require 'settings-sharelatex'

module.exports = AccountSyncController =

	syncHook: (req, res, next) ->
		v1UserIdStr = req.params.v1_user_id
		try
			v1UserId = parseInt(v1UserIdStr, 10)
		catch err
			logger.err {err, v1UserIdStr},
				"[AccountSync] error parsing v1 user id from route"
			return next(err)
		# Start this process but proceed immediately with response
		AccountSyncManager.doSync v1UserId, (err) ->
			if err?
				logger.err {err, v1UserId}, "[AccountSync] error syncing account"
		return res.sendStatus(200)

	startTrial: (req, res, next) ->
		user_id = AuthenticationController.getLoggedInUserId req
		UserGetter.getUser user_id, { overleaf: true }, (error, user) ->
			return next(error) if error?
			if user?.overleaf?.id?
				res.redirect "#{settings.overleaf.host}/users/trial?trial=2017-pro-plus-trial"
			else
				res.redirect "#{settings.accountMerge.sharelatexHost}/user/subscription/new?planCode=collaborator_free_trial_7_days&ssp=true"

	getV2PlanCode: (req, res, next) ->
		{v1_user_id} = req.params
		v1_user_id = parseInt(v1_user_id, 10)
		logger.log {v1_user_id}, "[AccountSync] getting v1 user plan_code in v2"
		AccountSyncManager.getV2PlanCode v1_user_id, (error, plan_code, has_subscription_or_team) ->
			return next(error) if error?
			if !plan_code?
				logger.log {v1_user_id}, "[AccountSync] user not found in v2"
				res.sendStatus 404
			else
				logger.log {v1_user_id, plan_code}, "[AccountSync] returning v2 plan_code"
				res.json {plan_code, has_subscription_or_team}

	getV2SubscriptionStatus: (req, res, next) ->
		{v1_user_id} = req.params
		v1_user_id = parseInt(v1_user_id, 10)
		logger.log {v1_user_id}, "[AccountSync] getting v1 user subscription status in v2"
		AccountSyncManager.getV2SubscriptionStatus v1_user_id, (error, status) ->
			return next(error) if error?
			logger.log {v1_user_id, status}, "[AccountSync] returning v2 subscription status"
			res.json status
