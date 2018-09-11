CollabratecController = require "./Collabratec/CollabratecController"
CollabratecManager = require "./Collabratec/CollabratecManager"
OverleafAuthenticationController = require "./Authentication/OverleafAuthenticationController"
AccountDeleteController = require "./AccountDelete/AccountDeleteController"
ProjectImportController = require "./ProjectImport/ProjectImportController"
TeamImportController = require "./TeamImport/TeamImportController"
AuthenticationController = require "../../../../app/js/Features/Authentication/AuthenticationController"
AccountSyncController = require "./AccountSync/AccountSyncController"
SharelatexAuthController = require "./SharelatexAuth/SharelatexAuthController"
V1LoginController = require "./V1Login/V1LoginController"
AuthorizationMiddlewear = require('../../../../app/js/Features/Authorization/AuthorizationMiddlewear')
RateLimiterMiddlewear = require('../../../../app/js/Features/Security/RateLimiterMiddlewear')
passport = require "passport"
logger = require "logger-sharelatex"
qs = require 'querystring'
settings = require 'settings-sharelatex'

module.exports =
	apply: (webRouter, privateApiRouter, publicApiRouter) ->
		removeRoute(webRouter, 'get', '/login')
		webRouter.get '/login', OverleafAuthenticationController.welcomeScreen
		webRouter.get '/login/v1', V1LoginController.loginPage
		webRouter.post '/login/v1', V1LoginController.doLogin

		removeRoute(webRouter, 'get', '/logout')
		webRouter.get '/logout', OverleafAuthenticationController.logout

		webRouter.get '/register/v1', V1LoginController.registrationPage
		webRouter.post '/register/v1', V1LoginController.doRegistration

		webRouter.get(
			'/overleaf/auth_from_v1',
			OverleafAuthenticationController.saveRedir,
			OverleafAuthenticationController.showCheckAccountsPage
		)
		webRouter.get '/overleaf/login', OverleafAuthenticationController.saveRedir, passport.authenticate("overleaf")
		webRouter.get '/register', (req, res, next) -> res.redirect("/login?#{qs.stringify(req.query)}")

		webRouter.get(
			'/login/sharelatex/finish',
			AuthenticationController.requireLogin(),
			SharelatexAuthController.finishPage
		)

		webRouter.get(
			'/overleaf/callback',
			OverleafAuthenticationController.setupUser
		)

		webRouter.get(
			'/overleaf/confirmed_account_merge',
			OverleafAuthenticationController.confirmedAccountMerge
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
			'/overleaf/import_team/',
			AuthenticationController.httpAuth,
			TeamImportController.create
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

		publicApiRouter.get(
			'/overleaf/user/:v1_user_id',
			AuthenticationController.httpAuth,
			AccountSyncController.getV2User
		)

		webRouter.get '/user/trial', AccountSyncController.startTrial

		if settings.createV1AccountOnLogin
			logger.log {}, "[OverleafIntegrationRouter] replacing '/user/delete' route"
			removeRoute webRouter, 'post', '/user/delete'
			webRouter.post '/user/delete',
				AuthenticationController.requireLogin(),
				AccountDeleteController.tryDeleteUser

		privateApiRouter.get(
			'/overleaf/import/failures',
			ProjectImportController.getFailures
		)

		if settings.collabratec?
			webRouter.get '/collabratec/auth/link', CollabratecController.oauthLink
			webRouter.get settings.collabratec.saml.init_path, (req, res, next) ->
				(passport.authenticate('saml'))(req, res, next)
			webRouter.get '/org/ieee/collabratec/auth/link_after_saml_response', CollabratecController.oauthLinkAfterSaml
			webRouter.post '/org/ieee/collabratec/auth/confirm_link', CollabratecController.oauthConfirmLink
			webRouter.post '/org/ieee/collabratec/auth/sign_in_to_link', CollabratecController.oauthSignin

	applyNonCsrfRouter: (webRouter, privateApiRouter, publicApiRouter) ->
		if settings.collabratec?
			webRouter.post settings.collabratec.saml.callback_path, passport.authenticate('saml'), CollabratecController.samlConsume

removeRoute = (router, method, path)->
	index = null
	for route, i in router.stack
		if route?.route?.path == path and route.route.methods[method]
			index = i
	if index?
		logger.log method:method, path:path, index:index, "removing route from express router"
		router.stack.splice(index,1)
