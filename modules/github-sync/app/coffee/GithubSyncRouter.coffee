GithubSyncController = require './GithubSyncController'
GithubSyncMiddleware = require './GithubSyncMiddleware'
AuthenticationController = require "../../../../app/js/Features/Authentication/AuthenticationController"
AuthorizationMiddleware = require "../../../../app/js/Features/Authorization/AuthorizationMiddleware"

module.exports =
	apply: (app) ->
		app.get '/github-sync/beginAuth', AuthenticationController.requireLogin(),  GithubSyncController.login
		app.get '/github-sync/completeRegistration', AuthenticationController.requireLogin(),  GithubSyncController.auth
		app.post '/github-sync/unlink', AuthenticationController.requireLogin(), GithubSyncController.unlink
		app.get '/github-sync/linked', AuthenticationController.requireLogin(), GithubSyncController.showLinkedPage
		
		app.get '/user/settings', GithubSyncMiddleware.injectUserSettings
		
		app.get '/user/github-sync/status', AuthenticationController.requireLogin(), GithubSyncController.getUserStatus
		app.get '/user/github-sync/orgs', AuthenticationController.requireLogin(), GithubSyncController.getUserLoginAndOrgs
		app.get '/user/github-sync/repos', AuthenticationController.requireLogin(), GithubSyncController.getUserRepos
		
		app.get '/project/:Project_id/github-sync/status', AuthorizationMiddleware.ensureUserCanReadProject, GithubSyncController.getProjectStatus
		app.get '/project/:Project_id/github-sync/commits/unmerged', AuthorizationMiddleware.ensureUserCanReadProject, GithubSyncController.getProjectUnmergedCommits
		app.post '/project/:Project_id/github-sync/merge', AuthorizationMiddleware.ensureUserCanWriteProjectContent, GithubSyncController.mergeProject

		app.post '/project/:Project_id/github-sync/export', AuthorizationMiddleware.ensureUserCanWriteProjectContent, GithubSyncController.exportProject
		app.post '/project/new/github-sync', AuthenticationController.requireLogin(), GithubSyncController.importProject