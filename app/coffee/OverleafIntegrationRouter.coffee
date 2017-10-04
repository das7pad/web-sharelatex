OverleafAuthenticationController = require "./Authentication/OverleafAuthenticationController"
ProjectImportController = require "./ProjectImport/ProjectImportController"
ProjectRedirectController = require "./ProjectRedirect/ProjectRedirectController"
AuthenticationController = require "../../../../app/js/Features/Authentication/AuthenticationController"
passport = require "passport"
logger = require "logger-sharelatex"

module.exports = 
	apply: (webRouter) ->
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

		webRouter.get(
			'/overleaf/project/:ol_doc_id/import',
			AuthenticationController.requireLogin(),
			ProjectImportController.importProject
		)
		
		# TODO: This, and the route below are just stubs to support overleaf
		# compatible URLs. They don't do any auth/the right thing at all.
		# They should eventually be replaced by URLs that do the proper auth
		# and redirecting by https://github.com/overleaf/sharelatex/issues/103
		webRouter.get(
			'/:token([0-9]+[a-z]+)',
			ProjectRedirectController.redirectDocByToken
		)
		webRouter.get(
			'/read/:read_token',
			ProjectRedirectController.redirectDocByReadToken
		)

removeRoute = (router, method, path)->
	index = null
	for route, i in router.stack
		if route?.route?.path == path and route.route.methods[method]
			index = i
	if index?
		logger.log method:method, path:path, index:index, "removing route from express router"
		router.stack.splice(index,1)