AuthenticationController = require "../../../../app/js/Features/Authentication/AuthenticationController"
CollabratecController = require "./CollabratecController"
CollabratecMiddleware = require "./CollabratecMiddleware"
Settings = require "settings-sharelatex"
multer = require "multer"

upload = multer(dest: Settings.path.uploadFolder)

module.exports = 
	apply: (webRouter, privateApiRouter, publicApiRouter) ->
		return unless Settings.overleaf

		publicApiRouter.get "/api/v1/collabratec/users/current_user/projects", AuthenticationController.requireOauth(), CollabratecMiddleware.v1Proxy, CollabratecController.getProjects

		publicApiRouter.post "/api/v1/collabratec/users/current_user/projects", AuthenticationController.requireOauth(), CollabratecController.createProject

		publicApiRouter.post "/api/v1/collabratec/users/current_user/projects/upload", AuthenticationController.requireOauth(), upload.single('zipfile'), CollabratecMiddleware.v1Proxy, CollabratecController.uploadProject

		publicApiRouter.delete "/api/v1/collabratec/users/current_user/projects/:project_id", AuthenticationController.requireOauth(), CollabratecMiddleware.v1Proxy, CollabratecMiddleware.ensureUserCanDeleteProject, CollabratecController.deleteProject

		publicApiRouter.post "/api/v1/collabratec/users/current_user/projects/:project_id/collabratec", AuthenticationController.requireOauth(), CollabratecMiddleware.v1Proxy, CollabratecMiddleware.ensureUserCanAdminProject,CollabratecController.linkProject

		publicApiRouter.post "/api/v1/collabratec/users/current_user/projects/:project_id/clone", AuthenticationController.requireOauth(), CollabratecMiddleware.v1Proxy, CollabratecMiddleware.ensureUserCanReadProject,CollabratecController.cloneProject

		publicApiRouter.delete "/api/v1/collabratec/users/current_user/projects/:project_id/collabratec", AuthenticationController.requireOauth(), CollabratecMiddleware.v1Proxy, CollabratecMiddleware.ensureUserCanAdminProject,CollabratecController.unlinkProject

		publicApiRouter.get "/api/v1/collabratec/users/current_user/projects/:project_id/metadata", AuthenticationController.requireOauth(), CollabratecMiddleware.v1Proxy, CollabratecMiddleware.ensureUserCanReadProject, CollabratecController.getProjectMetadata
