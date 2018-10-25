Settings = require 'settings-sharelatex'
logger = require 'logger-sharelatex'
GitBridgeController = require './GitBridgeController'


module.exports = GitBridgeRouter =

	apply: (webRouter, apiRouter) ->
		if !Settings.overleaf?
			logger.log {}, "[GitBridgeRouter] Not running with overleaf settings, not setting up git-bridge"
			return

		apiRouter.get  '/api/git-bridge/docs/:project_id', GitBridgeController.showDoc
		apiRouter.get  '/api/git-bridge/docs/:project_id/saved_vers', GitBridgeController.showSavedVers
		apiRouter.get  '/api/git-bridge/docs/:project_id/snapshots/:version', GitBridgeController.showSnapshot
		apiRouter.post '/api/git-bridge/docs/:project_id/snapshots', GitBridgeController.applySnapshot

