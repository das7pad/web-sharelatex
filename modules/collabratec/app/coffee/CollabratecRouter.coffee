AuthenticationController = require "../../../../app/js/Features/Authentication/AuthenticationController"
AuthorizationMiddlewear = require "../../../../app/js/Features/Authorization/AuthorizationMiddlewear"
CollabratecController = require "./CollabratecController"
CollabratecMiddleware = require "./CollabratecMiddleware"
settings = require "settings-sharelatex"

module.exports = 
	apply: (webRouter, privateApiRouter, publicApiRouter) ->
		return unless settings.overleaf

		publicApiRouter.get "/api/v1/collabratec/users/current_user/projects", AuthenticationController.requireOauth(), CollabratecController.getProjects

		publicApiRouter.get "/api/v1/collabratec/users/current_user/projects/:project_id/metadata", AuthenticationController.requireOauth(), CollabratecMiddleware.v1ProjectProxy, AuthorizationMiddlewear.ensureUserCanReadProject, CollabratecController.getProjectMetadata
