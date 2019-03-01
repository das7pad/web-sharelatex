RedirectSLToV2Middleware = require "./RedirectSLToV2Middleware"
AccountMergeController = require "./AccountMergeController"
LogInToV2Controller = require "./LogInToV2Controller"
AuthenticationController = require "../../../../app/js/Features/Authentication/AuthenticationController"
RateLimiterMiddleware = require('../../../../app/js/Features/Security/RateLimiterMiddleware')
Settings = require 'settings-sharelatex'
Path = require 'path'

module.exports = 
	applyNonCsrfRouter: (webRouter) ->
		webRouter.use RedirectSLToV2Middleware

	apply: (webRouter) ->
		webRouter.get '/user/confirm_account_merge', AccountMergeController.showConfirmAccountMerge
		webRouter.post '/user/confirm_account_merge', AccountMergeController.confirmAccountMerge
		webRouter.get '/user/login_to_ol_v2', AuthenticationController.requireLogin(), LogInToV2Controller.showLogInToV2Interstitial
		webRouter.get '/user/auth_with_ol_v2', AuthenticationController.requireLogin(), LogInToV2Controller.signAndRedirectToLogInToV2

		if Settings.createV1AccountOnLogin
			webRouter.get '/migrated-to-overleaf', (req, res, next) ->
				res.render Path.resolve(__dirname, '../views/migrated_to_overleaf')

			webRouter.post '/account-merge/email/overleaf',
				AuthenticationController.requireLogin(),
				RateLimiterMiddleware.rateLimit({
					endpointName: "account-merge-email-overleaf"
					maxRequests: 10
					timeInterval: 60
				}),
				AccountMergeController.sendOverleafAccountMergeEmail
