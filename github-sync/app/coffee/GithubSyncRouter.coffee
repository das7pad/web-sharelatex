GithubSyncController = require './GithubSyncController'
GithubSyncMiddlewear = require './GithubSyncMiddlewear'
AuthenticationController = require "../../../../app/js/Features/Authentication/AuthenticationController"
AuthorizationMiddlewear = require "../../../../app/js/Features/Authorization/AuthorizationMiddlewear"

module.exports =
	apply: (app) ->
		app.get '/github-sync/beginAuth', AuthenticationController.requireLogin(),  GithubSyncController.login
		app.get '/github-sync/completeRegistration', AuthenticationController.requireLogin(),  GithubSyncController.auth
		app.post '/github-sync/unlink', AuthenticationController.requireLogin(), GithubSyncController.unlink
		app.get '/github-sync/linked', AuthenticationController.requireLogin(), GithubSyncController.showLinkedPage
		
		app.get '/user/settings', GithubSyncMiddlewear.injectUserSettings
		
		app.get '/user/github-sync/status', AuthenticationController.requireLogin(), GithubSyncController.getUserStatus
		app.get '/user/github-sync/orgs', AuthenticationController.requireLogin(), GithubSyncController.getUserLoginAndOrgs
		app.get '/user/github-sync/repos', AuthenticationController.requireLogin(), GithubSyncController.getUserRepos
		
		app.get '/project/:Project_id/github-sync/status', AuthorizationMiddlewear.ensureUserCanReadProject, GithubSyncController.getProjectStatus
		app.get '/project/:Project_id/github-sync/commits/unmerged', AuthorizationMiddlewear.ensureUserCanReadProject, GithubSyncController.getProjectUnmergedCommits
		app.post '/project/:Project_id/github-sync/merge', AuthorizationMiddlewear.ensureUserCanWriteProjectContent, GithubSyncController.mergeProject

		app.post '/project/:Project_id/github-sync/export', AuthorizationMiddlewear.ensureUserCanAdminProject, GithubSyncController.exportProject
		app.post '/project/new/github-sync', AuthenticationController.requireLogin(), GithubSyncController.importProject