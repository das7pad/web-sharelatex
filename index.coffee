CollabratecManager = require "./app/js/Collabratec/CollabratecManager"
OverleafIntegrationRouter = require "./app/js/OverleafIntegrationRouter"
OverleafAuthenticationManager = require "./app/js/Authentication/OverleafAuthenticationManager"
ProjectListGetter = require "./app/js/ProjectList/ProjectListGetter"
OAuth2Strategy = require('passport-oauth2').Strategy
SamlStrategy = require('passport-saml').Strategy
refresh = require('passport-oauth2-refresh')
AccountSyncManager = require "./app/js/AccountSync/AccountSyncManager"

settings = require "settings-sharelatex"

OverleafIntegration =
	router: OverleafIntegrationRouter

	hooks:
		passportSetup: (passport) ->
			{clientID, clientSecret} = settings.overleaf.oauth
			overleafOAuth2Strategy = new OAuth2Strategy({
					authorizationURL: "#{settings.overleaf.host}/oauth/authorize",
					tokenURL: "#{settings.overleaf.host}/oauth/token",
					callbackURL: "#{settings.siteUrl}/overleaf/callback"
					clientID, clientSecret
			}, OverleafAuthenticationManager.setupOAuthUser)

			overleafOAuth2Strategy.userProfile = OverleafAuthenticationManager.getUserProfile

			passport.use("overleaf", overleafOAuth2Strategy)
			refresh.use("overleaf", overleafOAuth2Strategy)

			if settings.collabratec?
				saml_config = settings.collabratec.saml
				passport.use new SamlStrategy {
					identifierFormat: saml_config.identifier_format
					callbackUrl: "#{saml_config.callback_host}#{saml_config.callback_path}"
					cert: saml_config.cert,
					entryPoint: saml_config.entry_point
					issuer: saml_config.issuer
				}, CollabratecManager.validateSamlData

		findAllV1Projects: ProjectListGetter.findAllUsersProjects
		getV1PlanCode: (args...) ->
			AccountSyncManager.getPlanCodeFromV1(args...)

if !settings.overleaf?.oauth?
	module.exports = {}
else
	module.exports = OverleafIntegration
