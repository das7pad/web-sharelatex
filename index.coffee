OverleafOAuthRouter = require "./app/js/OverleafOAuthRouter"
OverleafAuthenticationManager = require "./app/js/OverleafAuthenticationManager"
OAuth2Strategy = require('passport-oauth2').Strategy
settings = require "settings-sharelatex"

module.exports = OverleafOAuth =
	router: OverleafOAuthRouter

	hooks:
		passportSetup: (passport) ->
			return if !settings.overleaf_oauth?
			{clientID, clientSecret, host} = settings.overleaf_oauth
			overleafOAuth2Strategy = new OAuth2Strategy({
					authorizationURL: "#{host}/oauth/authorize",
					tokenURL: "#{host}/oauth/token",
					callbackURL: "#{settings.siteUrl}/overleaf/callback"
					clientID, clientSecret
			}, OverleafAuthenticationManager.setupUser)

			overleafOAuth2Strategy.userProfile = OverleafAuthenticationManager.getUserProfile

			passport.use(overleafOAuth2Strategy)
