logger = require 'logger-sharelatex'
GitBridgeController = require './GitBridgeController'
AuthenticationController = require '../../../../app/js/Features/Authentication/AuthenticationController'
AuthorizationMiddlewear = require '../../../../app/js/Features/Authorization/AuthorizationMiddlewear'
httpProxy = require 'express-http-proxy'
URL = require 'url'


module.exports = GitBridgeRouter =

	apply: (webRouter, privateApiRouter, publicApiRouter) ->

		publicApiRouter.get  '/api/v0/docs/:project_id',
			AuthenticationController.requireOauth(),
			AuthorizationMiddlewear.ensureUserCanReadProject,
			GitBridgeController.getLatestProjectVersion

		publicApiRouter.get  '/api/v0/docs/:project_id/saved_vers',
			AuthenticationController.requireOauth(),
			AuthorizationMiddlewear.ensureUserCanReadProject,
			GitBridgeController.showSavedVers

		publicApiRouter.get  '/api/v0/docs/:project_id/snapshots/:version',
			AuthenticationController.requireOauth(),
			AuthorizationMiddlewear.ensureUserCanReadProject,
			GitBridgeController.showSnapshot

		publicApiRouter.post '/api/v0/docs/:project_id/snapshots',
			AuthenticationController.requireOauth(),
			AuthorizationMiddlewear.ensureUserCanWriteProjectContent,
			GitBridgeController.applySnapshot
