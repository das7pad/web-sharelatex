request = require "request"
settings = require "settings-sharelatex"
logger = require "logger-sharelatex"

GithubSyncApiHandler = require "./GithubSyncApiHandler"

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
		
	getProjectStatus: (req, res, next) ->
		project_id = req.params.Project_id
		GithubSyncApiHandler.getProjectStatus project_id, (error, status) ->
			return next(error) if error?
			res.header("Content-Type", "application/json")
			res.json(status)