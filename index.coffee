CollabratecManager = require "./app/js/Collabratec/CollabratecManager"
OverleafIntegrationRouter = require "./app/js/OverleafIntegrationRouter"
OverleafAuthenticationManager = require "./app/js/Authentication/OverleafAuthenticationManager"
ProjectListGetter = require "./app/js/ProjectList/ProjectListGetter"
OAuth2Strategy = require('passport-oauth2').Strategy
SamlStrategy = require('passport-saml').Strategy
OrcidStrategy = require('passport-orcid').Strategy
GoogleStrategy = require('passport-google-oauth20').Strategy
TwitterStrategy = require('passport-twitter').Strategy
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

			if settings.sso?
				orcid = settings.sso.orcid
				if orcid?.client_id?
					callback_url = settings.siteUrl + orcid.callback_path
					passport.use(
						new OrcidStrategy(
							{
								clientID: orcid.client_id,
								clientSecret: orcid.client_secret,
								callbackURL: callback_url
							},
							(accessToken, refreshToken, params, profile, callback) ->
								callback(null, {
									auth_provider: 'orcid'
									auth_provider_uid: params.orcid
									name: params.name
								})
						)
					)

				google = settings.sso.google
				if google?.client_id?
					callback_url = settings.siteUrl + google.callback_path
					passport.use(
						new GoogleStrategy(
							{
								clientID: google.client_id,
								clientSecret: google.client_secret,
								callbackURL: callback_url
							},
							(accessToken, refreshToken, profile, callback) ->
								if profile.name?.givenName? && profile.name?.familyName?
									name = profile.name.givenName + ' ' + profile.name.familyName
								callback(null, {
									auth_provider: 'google'
									auth_provider_uid: profile.id
									email: profile.emails?[0]?.value
									name: name
								})
						)
					)

				twitter = settings.sso.twitter
				if twitter?.client_id?
					callback_url = settings.siteUrl + twitter.callback_path
					passport.use(
						new TwitterStrategy(
							{
								consumerKey: twitter.client_id,
								consumerSecret: twitter.client_secret,
								callbackURL: callback_url
							},
							(token, tokenSecret, profile, callback) ->
								callback(null, {
									auth_provider: 'twitter'
									auth_provider_uid: profile.id
									name: profile.name
								})
						)
					)

		findAllV1Projects: ProjectListGetter.findAllUsersProjects
		getV1PlanCode: (args...) ->
			AccountSyncManager.getPlanCodeFromV1(args...)

if !settings.overleaf?.oauth?
	module.exports = {}
else
	module.exports = OverleafIntegration
