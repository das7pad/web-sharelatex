AuthenticationController = require "../../../../app/js/Features/Authentication/AuthenticationController"
AuthorizationMiddlewear = require "../../../../app/js/Features/Authorization/AuthorizationMiddlewear"
CollabratecController = require "./CollabratecController"
CollabratecMiddleware = require "./CollabratecMiddleware"
settings = require "settings-sharelatex"

module.exports = 
	apply: (webRouter, privateApiRouter, publicApiRouter) ->
		return unless settings.overleaf

		publicApiRouter.get "/api/v1/collabratec/users/current_user/projects", AuthenticationController.requireOauth(), CollabratecMiddleware.v1Proxy, CollabratecController.getProjects

		publicApiRouter.post "/api/v1/collabratec/users/current_user/projects", AuthenticationController.requireOauth(), CollabratecMiddleware.v1Proxy, CollabratecController.createProject

		publicApiRouter.get "/api/v1/collabratec/users/current_user/projects/:project_id/metadata", AuthenticationController.requireOauth(), CollabratecMiddleware.v1Proxy, AuthorizationMiddlewear.ensureUserCanReadProject, CollabratecController.getProjectMetadata
