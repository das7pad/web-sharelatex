request = require "request"
settings = require "settings-sharelatex"
logger = require "logger-sharelatex"

module.exports = GithubSyncApiHandler =
	getLoginUrl: (user_id, callback = (error, loginUrl) ->) ->
		url = "#{settings.apis.githubSync.url}/user/#{user_id}/loginUrl"
		GithubSyncApiHandler.apiRequest {
			method: "get"
			url: url
			json: true
		}, (error, body) ->
			return callback(error) if error?
			callback null, body.url
			
	doAuth: (user_id, options, callback = (error) ->) ->
		url = "#{settings.apis.githubSync.url}/user/#{user_id}/completeAuth"
		GithubSyncApiHandler.apiRequest {
			method: "post"
			url: url
			json: options
		}, callback

	getStatus: (user_id, callback = (error, status) ->) ->
		url = "#{settings.apis.githubSync.url}/user/#{user_id}/status"
		GithubSyncApiHandler.apiRequest {
			method: "get",
			url: url,
			json: true
		}, callback
				
	apiRequest: (options, callback = (error, body) ->) ->
		request options, (error, response, body) ->
			return callback(error) if error?
			if 200 <= response.statusCode < 300
				callback null, body
			else
				error = new Error("non-success status code returned from github-sync api: #{response.statusCode}")
				logger.error err:error, body: body, statusCode: response.statusCode, "github-sync api error"
				callback(error)