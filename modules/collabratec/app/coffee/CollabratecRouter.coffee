AuthenticationController = require "../../../../app/js/Features/Authentication/AuthenticationController"
CollabratecController = require "./CollabratecController"
CollabratecMiddleware = require "./CollabratecMiddleware"
settings = require "settings-sharelatex"

module.exports = 
	apply: (webRouter, privateApiRouter, publicApiRouter) ->
		return unless settings.overleaf

		publicApiRouter.get "/api/v1/collabratec/users/current_user/projects", AuthenticationController.requireOauth(), CollabratecMiddleware.v1Proxy, CollabratecController.getProjects

		publicApiRouter.post "/api/v1/collabratec/users/current_user/projects", AuthenticationController.requireOauth(), CollabratecMiddleware.v1Proxy, CollabratecController.createProject

		publicApiRouter.delete "/api/v1/collabratec/users/current_user/projects/:project_id", AuthenticationController.requireOauth(), CollabratecMiddleware.v1Proxy, CollabratecMiddleware.ensureUserCanDeleteProject, CollabratecController.deleteProject

		publicApiRouter.post "/api/v1/collabratec/users/current_user/projects/:project_id/collabratec", AuthenticationController.requireOauth(), CollabratecMiddleware.v1Proxy, CollabratecMiddleware.ensureUserCanAdminProject,CollabratecController.linkProject

		publicApiRouter.delete "/api/v1/collabratec/users/current_user/projects/:project_id/collabratec", AuthenticationController.requireOauth(), CollabratecMiddleware.v1Proxy, CollabratecMiddleware.ensureUserCanAdminProject,CollabratecController.unlinkProject

		publicApiRouter.get "/api/v1/collabratec/users/current_user/projects/:project_id/metadata", AuthenticationController.requireOauth(), CollabratecMiddleware.v1Proxy, CollabratecMiddleware.ensureUserCanReadProject, CollabratecController.getProjectMetadata
