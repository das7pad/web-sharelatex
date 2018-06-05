OverleafAuthenticationController = require "./Authentication/OverleafAuthenticationController"
ProjectImportController = require "./ProjectImport/ProjectImportController"
AuthenticationController = require "../../../../app/js/Features/Authentication/AuthenticationController"
AccountSyncController = require "./AccountSync/AccountSyncController"
SharelatexAuthController = require "./SharelatexAuth/SharelatexAuthController"
RateLimiterMiddlewear = require('../../../../app/js/Features/Security/RateLimiterMiddlewear')
passport = require "passport"
logger = require "logger-sharelatex"
qs = require 'querystring'

module.exports = 
	apply: (webRouter, privateApiRouter, publicApiRouter) ->
		removeRoute(webRouter, 'get', '/login')
		webRouter.get '/login', OverleafAuthenticationController.welcomeScreen

		webRouter.get '/overleaf/login', passport.authenticate("overleaf")
		webRouter.get '/register', (req, res, next) -> res.redirect("/login?#{qs.stringify(req.query)}")
		
		webRouter.get(
			'/overleaf/callback',
			OverleafAuthenticationController.setupUser,
			OverleafAuthenticationController.doLogin
		)

		webRouter.get(
			'/overleaf/confirmed_account_merge',
			OverleafAuthenticationController.confirmedAccountMerge,
			OverleafAuthenticationController.doLogin
		)

		webRouter.post(
			'/overleaf/project/:ol_doc_id/import',
			AuthenticationController.requireLogin(),
			ProjectImportController.importProject
		)

		webRouter.get(
			'/overleaf/auth_from_sl',
			SharelatexAuthController.authFromSharelatex
		)

		publicApiRouter.post(
			'/overleaf/user/:v1_user_id/sync',
			RateLimiterMiddlewear.rateLimit({
				endpointName: 'overleaf-user-details-sync',
				params: ["v1_user_id"]
				maxRequests: 10
				timeInterval: 60
			}),
			AuthenticationController.httpAuth, # Requires an user:pass to be set up in settings
			AccountSyncController.syncHook
		)

		publicApiRouter.get(
			'/overleaf/user/:v1_user_id/plan_code',
			AuthenticationController.httpAuth,
			AccountSyncController.getV2PlanCode
		)

		publicApiRouter.get(
			'/overleaf/user/:v1_user_id/subscription',
			AuthenticationController.httpAuth,
			AccountSyncController.getV2SubscriptionStatus
		)

		webRouter.get '/user/trial', AccountSyncController.startTrial

removeRoute = (router, method, path)->
	index = null
	for route, i in router.stack
		if route?.route?.path == path and route.route.methods[method]
			index = i
	if index?
		logger.log method:method, path:path, index:index, "removing route from express router"
		router.stack.splice(index,1)
