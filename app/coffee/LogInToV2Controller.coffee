jwt = require 'jsonwebtoken'
Settings = require 'settings-sharelatex'
logger = require 'logger-sharelatex'
Path = require('path')
AuthenticationController = require "../../../../app/js/Features/Authentication/AuthenticationController"
AnalyticsManager = require "../../../../app/js/Features/Analytics/AnalyticsManager"
V1UserFinder = require "./V1UserFinder"

module.exports = LogInToV2Controller =
	signAndRedirectToLogInToV2: (req, res, next) ->
		current_user_id = AuthenticationController.getLoggedInUserId(req)

		V1UserFinder.hasV1AccountNotLinkedYet current_user_id, (err, email, hasNotLinkedV1account) ->
			if err?
				logger.err {current_user_id, email}, "getting info from v1"
				return next(err)

			ol_token = jwt.sign(
				{ user_id: current_user_id, login: true },
				Settings.accountMerge.secret,
				{ expiresIn: '1m' }
			)

			if hasNotLinkedV1account && !req.query?.dont_link
				res.render Path.resolve(__dirname, "../views/offer_ol_account_merge"), {
					logged_in_user_id: AuthenticationController.getLoggedInUserId(req)
					ol_token: ol_token
				}
			else
				logger.log {current_user_id}, "logging user in to v2"
				AnalyticsManager.recordEvent(current_user_id, 'logs_into_v2', {v2_onboard: true})
				res.redirect Settings.accountMerge.betaHost + "/overleaf/auth_from_sl?token=#{ol_token}"
