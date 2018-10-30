Settings = require 'settings-sharelatex'
logger = require 'logger-sharelatex'
GitBridgeController = require './GitBridgeController'
AuthenticationController = require '../../../../app/js/Features/Authentication/AuthenticationController'
AuthorizationMiddlewear = require '../../../../app/js/Features/Authorization/AuthorizationMiddlewear'


module.exports = GitBridgeRouter =

	apply: (webRouter, apiRouter) ->
		if !Settings.overleaf?
			logger.log {}, "[GitBridgeRouter] Not running with overleaf settings, not setting up git-bridge"
			return

		apiRouter.get  '/api/git-bridge/docs/:project_id',
			AuthenticationController.requireOauth(),
			AuthorizationMiddlewear.ensureUserCanReadProject,
			GitBridgeController.getLatestProjectVersion

		apiRouter.get  '/api/git-bridge/docs/:project_id/saved_vers',
			AuthenticationController.requireOauth(),
			AuthorizationMiddlewear.ensureUserCanReadProject,
			GitBridgeController.showSavedVers

		apiRouter.get  '/api/git-bridge/docs/:project_id/snapshots/:version',
			AuthenticationController.requireOauth(),
			AuthorizationMiddlewear.ensureUserCanReadProject,
			GitBridgeController.showSnapshot

		apiRouter.post '/api/git-bridge/docs/:project_id/snapshots',
			AuthenticationController.requireOauth(),
			AuthorizationMiddlewear.ensureUserCanWriteProjectContent,
			GitBridgeController.applySnapshot

