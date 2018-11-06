AuthenticationController = require "../../../../app/js/Features/Authentication/AuthenticationController"
CollabratecController = require "./CollabratecController"
settings = require "settings-sharelatex"

module.exports = 
	apply: (webRouter, privateApiRouter, publicApiRouter) ->
		return unless settings.overleaf

		publicApiRouter.get "/api/v1/collabratec/users/current_user/projects", AuthenticationController.requireOauth(), CollabratecController.getProjects
