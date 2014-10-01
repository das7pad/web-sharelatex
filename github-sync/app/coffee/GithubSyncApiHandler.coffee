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

	getUserStatus: (user_id, callback = (error, status) ->) ->
		url = "#{settings.apis.githubSync.url}/user/#{user_id}/status"
		GithubSyncApiHandler.apiRequest {
			method: "get",
			url: url,
			json: true
		}, callback
		
	getProjectStatus: (project_id, callback = (error, status) ->) ->
		url = "#{settings.apis.githubSync.url}/project/#{project_id}/status"
		GithubSyncApiHandler.apiRequest {
			method: "get",
			url: url,
			json: true
		}, callback
		
	getUserLoginAndOrgs: (user_id, callback = (error, data) ->) ->
		url = "#{settings.apis.githubSync.url}/user/#{user_id}/orgs"
		GithubSyncApiHandler.apiRequest {
			method: "get",
			url: url,
			json: true
		}, callback
		
	exportProject: (project_id, owner_id, repo, files, callback = (error) ->) ->
		url = "#{settings.apis.githubSync.url}/project/#{project_id}/export"
		GithubSyncApiHandler.apiRequest {
			method: "post",
			url: url,
			json:
				owner_id: owner_id
				repo:     repo
				files:    files
		}, callback
		
	apiRequest: (options, callback = (error, body) ->) ->
		request options, (error, response, body) ->
			return callback(error) if error?
			if 200 <= response.statusCode < 300
				callback null, body
			else
				message = body?.error or "github-sync api error"
				error = new Error(message)
				error.statusCode = response.statusCode
				logger.error err:error, body: body, statusCode: response.statusCode, "github-sync api error"
				callback(error)