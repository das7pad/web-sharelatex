GithubSyncController = require './GithubSyncController'
AuthenticationController = require "../../../../app/js/Features/Authentication/AuthenticationController"

module.exports =
	apply: (app) ->
		app.get  '/github-sync/beginAuth', AuthenticationController.requireLogin(),  GithubSyncController.login
		app.get  '/github-sync/completeRegistration', AuthenticationController.requireLogin(),  GithubSyncController.auth
		app.get  '/github-sync/unlink', AuthenticationController.requireLogin(),  GithubSyncController.unlink
