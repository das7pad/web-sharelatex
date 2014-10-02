request = require "request"
settings = require "settings-sharelatex"
logger = require "logger-sharelatex"

GithubSyncApiHandler = require "./GithubSyncApiHandler"
GithubSyncExportHandler = require "./GithubSyncExportHandler"

module.exports = GithubSyncController =
	login: (req, res, next) ->
		user_id = req.session.user._id
		GithubSyncApiHandler.getLoginUrl user_id, (error, loginUrl) ->
			return next(error) if error?
			authUrl = "#{settings.siteUrl}/github-sync/completeRegistration"
			redirectUrl = "#{loginUrl}&redirect_uri=#{authUrl}"
			res.redirect redirectUrl
		
	auth: (req, res, next) ->
		user_id = req.session.user._id
		GithubSyncApiHandler.doAuth user_id, req.query, (error) ->
			return next(error) if error?
			res.redirect "/user/settings"
		
	unlink: (req, res, next) ->
		res.send("hello world from unlink")
		
	getUserStatus: (req, res, next) ->
		user_id = req.session.user._id
		GithubSyncApiHandler.getUserStatus user_id, (error, status) ->
			return next(error) if error?
			res.header("Content-Type", "application/json")
			res.json(status)
			
	getUserLoginAndOrgs: (req, res, next) ->
		user_id = req.session.user._id
		GithubSyncApiHandler.getUserLoginAndOrgs user_id, (error, data) ->
			return next(error) if error?
			res.header("Content-Type", "application/json")
			res.json(data)
			
	getUserRepos: (req, res, next) ->
		user_id = req.session.user._id
		GithubSyncApiHandler.getUserRepos user_id, (error, data) ->
			return next(error) if error?
			res.header("Content-Type", "application/json")
			res.json(data)
		
	getProjectStatus: (req, res, next) ->
		project_id = req.params.Project_id
		GithubSyncApiHandler.getProjectStatus project_id, (error, status) ->
			return next(error) if error?
			res.header("Content-Type", "application/json")
			res.json(status)
			
	exportProject: (req, res, next) ->
		project_id = req.params.Project_id
		{name, description, org} = req.body
		priv = req.body.private
		GithubSyncExportHandler.exportProject project_id, {
			name: name
			description: description
			org: org
			private: priv
		}, (error) ->
			return GithubSyncController._reportError(error, req, res, next) if error?
			res.status(200).end()
			
	mergeProject: (req, res, next) ->
		project_id = req.params.Project_id
		{message} = req.body
		GithubSyncExportHandler.mergeProject project_id, {
			message: message
		}, (error) ->
			return GithubSyncController._reportError(error, req, res, next) if error?
			res.status(200).end()
			
	_reportError: (error, req, res, next) ->
		if error.statusCode? and 400 <= error.statusCode < 500 # Validation/client error from upstream API
			res.status(error.statusCode)
			res.header("Content-Type", "application/json")
			res.json({error: error.message})
		else
			next(error)
		