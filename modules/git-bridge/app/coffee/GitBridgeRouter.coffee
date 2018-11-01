Settings = require 'settings-sharelatex'
logger = require 'logger-sharelatex'
GitBridgeController = require './GitBridgeController'
AuthenticationController = require '../../../../app/js/Features/Authentication/AuthenticationController'
AuthorizationMiddlewear = require '../../../../app/js/Features/Authorization/AuthorizationMiddlewear'


module.exports = GitBridgeRouter =

	apply: (webRouter, privateApiRouter, publicApiRouter) ->
		if !Settings.overleaf?
			logger.log {}, "[GitBridgeRouter] Not running with overleaf settings, not setting up git-bridge"
			return

		publicApiRouter.get  '/api/git-bridge/docs/:project_id',
			AuthenticationController.requireOauth(),
			AuthorizationMiddlewear.ensureUserCanReadProject,
			AuthorizationMiddlewear.ensureUserIsSiteAdmin,  # Temporary
			GitBridgeController.getLatestProjectVersion

		publicApiRouter.get  '/api/git-bridge/docs/:project_id/saved_vers',
			AuthenticationController.requireOauth(),
			AuthorizationMiddlewear.ensureUserCanReadProject,
			AuthorizationMiddlewear.ensureUserIsSiteAdmin,  # Temporary
			GitBridgeController.showSavedVers

		publicApiRouter.get  '/api/git-bridge/docs/:project_id/snapshots/:version',
			AuthenticationController.requireOauth(),
			AuthorizationMiddlewear.ensureUserCanReadProject,
			AuthorizationMiddlewear.ensureUserIsSiteAdmin,  # Temporary
			GitBridgeController.showSnapshot

		publicApiRouter.post '/api/git-bridge/docs/:project_id/snapshots',
			AuthenticationController.requireOauth(),
			AuthorizationMiddlewear.ensureUserCanWriteProjectContent,
			AuthorizationMiddlewear.ensureUserIsSiteAdmin,  # Temporary
			GitBridgeController.applySnapshot

