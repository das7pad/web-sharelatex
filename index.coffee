OverleafIntegrationRouter = require "./app/js/OverleafIntegrationRouter"
OverleafAuthenticationManager = require "./app/js/Authentication/OverleafAuthenticationManager"
ProjectListGetter = require "./app/js/ProjectList/ProjectListGetter"
OAuth2Strategy = require('passport-oauth2').Strategy
refresh = require('passport-oauth2-refresh')

settings = require "settings-sharelatex"

OverleafIntegration =
	router: OverleafIntegrationRouter

	hooks:
		passportSetup: (passport) ->
			{clientID, clientSecret} = settings.overleaf.oauth
			{host} = settings.overleaf
			overleafOAuth2Strategy = new OAuth2Strategy({
					authorizationURL: "#{host}/oauth/authorize",
					tokenURL: "#{host}/oauth/token",
					callbackURL: "#{settings.siteUrl}/overleaf/callback"
					clientID, clientSecret
			}, OverleafAuthenticationManager.setupUser)

			overleafOAuth2Strategy.userProfile = OverleafAuthenticationManager.getUserProfile

			passport.use("overleaf", overleafOAuth2Strategy)
			refresh.use("overleaf", overleafOAuth2Strategy)

		findAllV1Projects: ProjectListGetter.findAllUsersProjects
		getV1PlanCode: (args...) ->
			AccountSyncManager = require "./app/js/AccountSync/AccountSyncManager"
			AccountSyncManager.getPlanCodeFromOverleaf(args...)

if !settings.overleaf?.oauth?
	module.exports = {}
else
	module.exports = OverleafIntegration
