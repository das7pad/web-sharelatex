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
