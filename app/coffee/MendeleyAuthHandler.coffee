oauth2 = require('simple-oauth2')(
	site: 'https://api.mendeley.com'
	clientID: "1486"
	clientSecret: "NtITTocaolem4FSt")

request = require "request"
settings = require "settings-sharelatex"
logger = require "logger-sharelatex"
redirectUri = settings.siteUrl+'/mendeley/oauth/token-exchange'

UserUpdater = require("../../../../app/js/Features/User/UserUpdater")

module.exports = MendeleyAuthHandler =

	startAuth: (req, res) ->
		authorizationUri = oauth2.authCode.authorizeURL(
			redirect_uri: redirectUri
			scope: 'all')
		logger.log authorizationUri:authorizationUri, 'oauth started, redirecting to'
		res.redirect authorizationUri

	tokenExchange: (req, res, next) ->
		code = req.query.code
		logger.log code:code, 'Starting token exchange'
		oauth2.authCode.getToken {
			redirect_uri: redirectUri
			code: code
		}, (err, result) ->
			if err
				logger.err err:err, 'error exchanging mendeley tokens'
				res.redirect '/logout'
			else
				update = 
					$set:
						mendeley:
							access_token:result.access_token
							refresh_token:result.refresh_token

				console.log result, "resultttt", req.session?.user?._id, update
				UserUpdater.updateUser req.session?.user?._id, update, (err)->
					if err?
						logger.err err:err, result:result, "error setting mendeley info on user"
					res.redirect '/bibtex'
			return

