logger = require 'logger-sharelatex'
V1ApiController = require './V1ApiController'
AuthenticationController = require("../../../../app/js/Features/Authentication/AuthenticationController")

module.exports =
	apply: (webRouter, apiRouter, privateApiRouter) ->

		logger.log {}, "Init v1-api router"

		privateApiRouter.get(
			'/user/:user_id/v1/metrics_segmentation',
			AuthenticationController.httpAuth,
			V1ApiController.metricsSegmentation
		)
