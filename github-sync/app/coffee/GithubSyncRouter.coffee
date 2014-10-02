GithubSyncController = require './GithubSyncController'
GithubSyncMiddlewear = require './GithubSyncMiddlewear'
AuthenticationController = require "../../../../app/js/Features/Authentication/AuthenticationController"
SecurityManager = require "../../../../app/js/managers/SecurityManager"

module.exports =
	apply: (app) ->
		app.get  '/github-sync/beginAuth', AuthenticationController.requireLogin(),  GithubSyncController.login
		app.get  '/github-sync/completeRegistration', AuthenticationController.requireLogin(),  GithubSyncController.auth
		app.get  '/github-sync/unlink', AuthenticationController.requireLogin(),  GithubSyncController.unlink
		
		app.get '/user/settings', GithubSyncMiddlewear.injectUserSettings
		
		app.get '/user/github-sync/status', AuthenticationController.requireLogin(), GithubSyncController.getUserStatus
		app.get '/user/github-sync/orgs', AuthenticationController.requireLogin(), GithubSyncController.getUserLoginAndOrgs
		app.get '/project/:Project_id/github-sync/status', SecurityManager.requestCanAccessProject, GithubSyncController.getProjectStatus

		app.post '/project/:Project_id/github-sync/export', SecurityManager.requestIsAdmin, GithubSyncController.exportProject
		app.post '/project/:Project_id/github-sync/merge', SecurityManager.requestIsAdmin, GithubSyncController.mergeProject