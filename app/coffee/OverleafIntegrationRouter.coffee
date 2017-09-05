OverleafAuthenticationController = require "./Authentication/OverleafAuthenticationController"
ProjectImportController = require "./ProjectImport/ProjectImportController"
ProjectRedirectController = require "./ProjectRedirect/ProjectRedirectController"
AuthenticationController = require "../../../../app/js/Features/Authentication/AuthenticationController"
passport = require "passport"

module.exports = 
	apply: (webRouter) ->
		webRouter.get '/overleaf/login', passport.authenticate("overleaf")
		
		webRouter.get(
			'/overleaf/callback',
			OverleafAuthenticationController.setupUser,
			OverleafAuthenticationController.doLogin
		)

		webRouter.get '/overleaf/email_exists', OverleafAuthenticationController.emailExists

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
			ProjectRedirectController.redirectDocByToken
		)