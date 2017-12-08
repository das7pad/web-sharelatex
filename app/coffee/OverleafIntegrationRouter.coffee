OverleafAuthenticationController = require "./Authentication/OverleafAuthenticationController"
ProjectImportController = require "./ProjectImport/ProjectImportController"
AuthenticationController = require "../../../../app/js/Features/Authentication/AuthenticationController"
AccountSyncController = require "./AccountSync/AccountSyncController"
passport = require "passport"
logger = require "logger-sharelatex"

module.exports = 
	apply: (webRouter, apiRouter) ->
		removeRoute(webRouter, 'get', '/login')
		webRouter.get '/login', (req, res) -> res.redirect '/overleaf/login'

		# TODO: This get overridden by the public-registration module which
		# loads after this, but we need a way to restrict
		# registration on the beta site.
		# removeRoute(webRouter, 'get', '/register')

		webRouter.get '/overleaf/login', passport.authenticate("overleaf")
		
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

		apiRouter.post(
			'/overleaf/user/:user_id/sync',
			AccountSyncController.syncHook
		)


removeRoute = (router, method, path)->
	index = null
	for route, i in router.stack
		if route?.route?.path == path and route.route.methods[method]
			index = i
	if index?
		logger.log method:method, path:path, index:index, "removing route from express router"
		router.stack.splice(index,1)
