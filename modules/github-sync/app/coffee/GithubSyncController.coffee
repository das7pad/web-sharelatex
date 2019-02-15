request = require "request"
settings = require "settings-sharelatex"
logger = require "logger-sharelatex"

Path = require "path"

GithubSyncApiHandler = require "./GithubSyncApiHandler"
GithubSyncExportHandler = require "./GithubSyncExportHandler"
GithubSyncImportHandler = require "./GithubSyncImportHandler"

AuthenticationController = require "../../../../app/js/Features/Authentication/AuthenticationController"
UserGetter = require "../../../../app/js/Features/User/UserGetter"

module.exports = GithubSyncController =
	login: (req, res, next) ->
		user_id = AuthenticationController.getLoggedInUserId(req)
		UserGetter.getUser user_id, (err, user) ->
			return next(err) if err?
			return res.sendStatus(403) unless user.features?.github
			GithubSyncApiHandler.getLoginUrl user_id, (error, loginUrl) ->
				return next(error) if error?
				authUrl = "#{settings.siteUrl}/github-sync/completeRegistration"
				redirectUrl = "#{loginUrl}&redirect_uri=#{authUrl}"
				res.redirect redirectUrl

	auth: (req, res, next) ->
		user_id = AuthenticationController.getLoggedInUserId(req)
		GithubSyncApiHandler.doAuth user_id, req.query, (error) ->
			return next(error) if error?
			res.redirect "/github-sync/linked"

	unlink: (req, res, next) ->
		user_id = AuthenticationController.getLoggedInUserId(req)
		GithubSyncApiHandler.unlink user_id, (error) ->
			return next(error) if error?
			res.redirect "/user/settings"

	showLinkedPage: (req, res, next) ->
		res.render __dirname + "/../views/github/linked"

	getUserStatus: (req, res, next) ->
		user_id = AuthenticationController.getLoggedInUserId(req)
		UserGetter.getUser user_id, (error, user) ->
			return next(error) if error?
			available = !!user.features.github
			if !available
				res.header("Content-Type", "application/json")
				res.json({
					available: false
					enabled:   false
				})
			else
				GithubSyncApiHandler.getUserStatus user_id, (error, status) ->
					return GithubSyncController._reportError(error, req, res, next) if error?
					res.header("Content-Type", "application/json")
					res.json({
						available: true
						enabled:   status.enabled
					})

	getUserLoginAndOrgs: (req, res, next) ->
		user_id = AuthenticationController.getLoggedInUserId(req)
		GithubSyncApiHandler.getUserLoginAndOrgs user_id, (error, data) ->
			return GithubSyncController._reportError(error, req, res, next) if error?
			res.header("Content-Type", "application/json")
			res.json(data)

	getUserRepos: (req, res, next) ->
		user_id = AuthenticationController.getLoggedInUserId(req)
		GithubSyncApiHandler.getUserRepos user_id, (error, data) ->
			return GithubSyncController._reportError(error, req, res, next) if error?
			res.header("Content-Type", "application/json")
			res.json(data)

	getProjectStatus: (req, res, next) ->
		project_id = req.params.Project_id
		GithubSyncApiHandler.getProjectStatus project_id, (error, status) ->
			return GithubSyncController._reportError(error, req, res, next) if error?
			res.header("Content-Type", "application/json")
			res.json(status)

	getProjectUnmergedCommits: (req, res, next) ->
		project_id = req.params.Project_id
		GithubSyncApiHandler.getProjectUnmergedCommits project_id, (error, commits) ->
			return GithubSyncController._reportError(error, req, res, next) if error?
			res.header("Content-Type", "application/json")
			res.json(
				commits.map (c) ->
					message: c.commit.message
					author: c.commit.author
					sha: c.sha
			)

	importProject: (req, res, next) ->
		res.setTimeout(10 * 60 * 1000) # Imports can take a while
		user_id = AuthenticationController.getLoggedInUserId(req)
		projectName = req.body.projectName?.trim()
		repo = req.body.repo
		GithubSyncImportHandler.importProject user_id, projectName, repo, (error, project_id) ->
			return GithubSyncController._reportError(error, req, res, next) if error?
			res.header("Content-Type", "application/json")
			res.json(project_id: project_id)

	exportProject: (req, res, next) ->
		project_id = req.params.Project_id
		user_id = AuthenticationController.getLoggedInUserId(req)
		{name, description, org} = req.body
		priv = req.body.private
		GithubSyncExportHandler.exportProject project_id, user_id, {
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
