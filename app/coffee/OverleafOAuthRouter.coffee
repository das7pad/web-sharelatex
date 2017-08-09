OverleafAuthenticationController = require("./OverleafAuthenticationController")
passport = require "passport"

module.exports = 
	apply: (webRouter) ->
		webRouter.get '/overleaf/login', passport.authenticate("oauth2")
		
		webRouter.get(
			'/overleaf/callback',
			OverleafAuthenticationController.setupUser,
			OverleafAuthenticationController.doLogin
		)

		webRouter.get '/overleaf/email_exists', OverleafAuthenticationController.emailExists
