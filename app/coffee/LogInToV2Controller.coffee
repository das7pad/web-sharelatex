jwt = require 'jsonwebtoken'
Settings = require 'settings-sharelatex'
logger = require 'logger-sharelatex'
AuthenticationController = require "../../../../app/js/Features/Authentication/AuthenticationController"
AnalyticsManager = require "../../../../app/js/Features/Analytics/AnalyticsManager"

module.exports = LogInToV2Controller =
	signAndRedirectToLogInToV2: (req, res, next) ->
		current_user_id = AuthenticationController.getLoggedInUserId(req)
		logger.log {current_user_id}, "logging user in to v2"
		ol_token = jwt.sign(
			{ user_id: current_user_id, login: true },
			Settings.accountMerge.secret,
			{ expiresIn: '1m' }
		)
		AnalyticsManager.recordEvent(current_user_id, 'logs_into_v2', {v2_onboard: true})
		res.redirect Settings.accountMerge.betaHost + "/overleaf/auth_from_sl?token=#{ol_token}"