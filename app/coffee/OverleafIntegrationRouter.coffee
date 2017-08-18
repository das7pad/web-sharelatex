OverleafAuthenticationController = require "./Authentication/OverleafAuthenticationController"
ProjectImportController = require "./ProjectImport/ProjectImportController"
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
			'/overleaf/project/:ol_project_id/import',
			AuthenticationController.requireLogin(),
			ProjectImportController.importProject
		)