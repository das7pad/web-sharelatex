Settings = require 'settings-sharelatex'
logger = require 'logger-sharelatex'
GitBridgeController = require './GitBridgeController'
AuthenticationController = require '../../../../app/js/Features/Authentication/AuthenticationController'
AuthorizationMiddlewear = require '../../../../app/js/Features/Authorization/AuthorizationMiddlewear'
httpProxy = require 'express-http-proxy'
URL = require 'url'


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

		# Proxy blob-content requests to project-history
		publicApiRouter.use '/history/blob', httpProxy(
			Settings.apis.project_history.url,
			proxyReqPathResolver: (req) ->
				path = req.path
				blobHash = path.split('/').slice(-1)[0]
				newPath = "/blob/#{blobHash}"
				logger.log {blobHash, path, newPath}, "[GitBridgeRouter] Proxy request for history content blob"
				return newPath
		)
