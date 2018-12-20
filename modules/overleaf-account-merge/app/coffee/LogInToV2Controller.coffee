jwt = require 'jsonwebtoken'
Settings = require 'settings-sharelatex'
logger = require 'logger-sharelatex'
Path = require('path')
AuthenticationController = require "../../../../app/js/Features/Authentication/AuthenticationController"
AnalyticsManager = require "../../../../app/js/Features/Analytics/AnalyticsManager"
LimitationsManager = require "../../../../app/js/Features/Subscription/LimitationsManager"
V1UserFinder = require "./V1UserFinder"
User = require("../../../../app/js/models/User").User
UserGetter = require('../../../../app/js/Features/User/UserGetter')

_canChooseToNotMerge = () ->
	return !Settings.createV1AccountOnLogin


module.exports = LogInToV2Controller =

	showLogInToV2Interstitial: (req, res, next) ->
		current_user_id = AuthenticationController.getLoggedInUserId(req)

		UserGetter.getUser current_user_id, {overleaf: 1}, (err, user) ->
			return next(err) if err?
			if user?.overleaf?.id?
				logger.log {user_id: current_user_id},
					"user already linked to overleaf account, sending to v2 login"
				return LogInToV2Controller.signAndRedirectToLogInToV2(req, res, next)

			V1UserFinder.hasV1AccountNotLinkedYet current_user_id, (err, email, hasNotLinkedV1account) ->
				if err?
					logger.err {current_user_id, email}, "error getting user from v1"
					return next(err)

				if req.query?.dont_link && _canChooseToNotMerge()
					return LogInToV2Controller.signAndRedirectToLogInToV2(req, res, next)

				if hasNotLinkedV1account
					# Email matched in v1
					LogInToV2Controller._renderMergePage(req, res, next)
				else
					# No email match in v1
					if Settings.createV1AccountOnLogin
						LogInToV2Controller._renderCheckAccountsPage(req, res, next)
					else
						LogInToV2Controller.signAndRedirectToLogInToV2(req, res, next)

	_renderMergePage: (req, res, next) ->
		user = AuthenticationController.getSessionUser(req)
		LimitationsManager.userHasSubscriptionOrIsGroupMember user, (err, hasSubscription) ->
			return next(err) if err?

			res.render Path.resolve(__dirname, "../views/offer_ol_account_merge"),
				v1LoginUrl: "#{Settings.accountMerge.betaHost}/login",
				hasSubscription: hasSubscription

	_renderCheckAccountsPage: (req, res, next) ->
		user = AuthenticationController.getSessionUser(req)
		LimitationsManager.userHasSubscriptionOrIsGroupMember user, (err, hasSubscription) ->
			return next(err) if err?

			res.render Path.resolve(__dirname, "../views/check_accounts"),
				email: user.email,
				hasSubscription: hasSubscription

	signAndRedirectToLogInToV2: (req, res, next) ->
		current_user_id = AuthenticationController.getLoggedInUserId(req)
		logger.log {current_user_id}, "logging user in to v2"

		ol_token = jwt.sign(
			{ user_id: current_user_id, login: true },
			Settings.accountMerge.secret,
			{ expiresIn: '15m' }
		)

		AnalyticsManager.recordEvent(current_user_id, 'logs_into_v2', {v2_onboard: true})
		res.redirect Settings.accountMerge.betaHost + "/overleaf/auth_from_sl?token=#{ol_token}"

	doPassportLoginHook: (req, email, callback=(err, info)->) ->
		if !Settings.createV1AccountOnLogin
			return callback(null, null)
		User.findOne {email: email}, {overleaf: 1}, (err, user) ->
			return callback(err) if err?
			if user?.overleaf?.id?
				# Prevent users who have already migrated from logging in to ShareLaTeX
				return callback(
					null,
					{redir: '/migrated-to-overleaf'}
				)
			else
				AuthenticationController.setRedirectInSession(req, '/user/login_to_ol_v2')
				return callback(null, null)
