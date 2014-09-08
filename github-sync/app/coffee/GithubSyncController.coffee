request = require "request"
settings = require "settings-sharelatex"
logger = require "logger-sharelatex"

module.exports = GithubSyncController =
	login: (req, res, next) ->
		user_id = req.session.user._id
		url = "#{settings.apis.githubSync.url}/user/#{user_id}/loginUrl"
		authUrl = "#{settings.siteUrl}/github-sync/completeRegistration"
		request.get {
			url: url,
			json: true
		}, (err, response, body) ->
			return next(error) if error?
			if 200 <= response.statusCode < 300
				redirectUrl = "#{body.url}&redirect_uri=#{authUrl}"
				res.redirect redirectUrl
			else
				error = new Error("non-success status code returned from github-sync api: #{response.statusCode}")
				logger.error err:error, body: body
				next(error)
		
	auth: (req, res, next) ->
		user_id = req.session.user._id
		url = "#{settings.apis.githubSync.url}/user/#{user_id}/completeAuth"
		request.post {
			url: url
			json: req.query
		}, (err, response, body) ->
			return next(error) if error?
			if 200 <= response.statusCode < 300
				res.redirect "/user/settings"
			else
				error = new Error("non-success status code returned from github-sync api: #{response.statusCode}")
				logger.error err:error, body: body
				next(error)
		
	unlink: (req, res, next) ->
		res.send("hello world from unlink")