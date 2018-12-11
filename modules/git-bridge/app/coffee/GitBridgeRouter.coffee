logger = require 'logger-sharelatex'
GitBridgeController = require './GitBridgeController'
AuthenticationController = require '../../../../app/js/Features/Authentication/AuthenticationController'
GitBridgeAuthorizationMiddleware = require './GitBridgeAuthorizationMiddleware'
httpProxy = require 'express-http-proxy'
URL = require 'url'


module.exports = GitBridgeRouter =

	apply: (webRouter, privateApiRouter, publicApiRouter) ->

		publicApiRouter.get  '/api/v0/docs/:project_id',
			AuthenticationController.requireOauth(),
			GitBridgeAuthorizationMiddleware.ensureUserCanReadProject,
			GitBridgeController.getLatestProjectVersion

		publicApiRouter.get  '/api/v0/docs/:project_id/saved_vers',
			AuthenticationController.requireOauth(),
			GitBridgeAuthorizationMiddleware.ensureUserCanReadProject,
			GitBridgeController.showSavedVers

		publicApiRouter.get  '/api/v0/docs/:project_id/snapshots/:version',
			AuthenticationController.requireOauth(),
			GitBridgeAuthorizationMiddleware.ensureUserCanReadProject,
			GitBridgeController.showSnapshot

		publicApiRouter.post '/api/v0/docs/:project_id/snapshots',
			AuthenticationController.requireOauth(),
			GitBridgeAuthorizationMiddleware.ensureUserCanWriteProjectContent,
			GitBridgeController.applySnapshot
