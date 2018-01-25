logger = require 'logger-sharelatex'
V1ApiController = require './V1ApiController'
AuthenticationController = require("../../../../app/js/Features/Authentication/AuthenticationController")
settings = require 'settings-sharelatex'

module.exports =
	apply: (webRouter, apiRouter, privateApiRouter) ->

		if !settings.overleaf?
			logger.log {}, "Overleaf settings not configured, skipping v1-api router"
			return

		logger.log {}, "Init v1-api router"

		privateApiRouter.get(
			'/user/:user_id/v1/metrics_segmentation',
			AuthenticationController.httpAuth,
			V1ApiController.metricsSegmentation
		)
