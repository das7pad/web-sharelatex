logger = require 'logger-sharelatex'
MetricsController = require './MetricsController'
AuthenticationController = require("../../../../app/js/Features/Authentication/AuthenticationController")
settings = require 'settings-sharelatex'

module.exports =
	apply: (webRouter, apiRouter, privateApiRouter) ->

		if !settings?.apis?.v1?.url?
			logger.log {},
				"Overleaf v1 api settings not configured, skipping metrics router"
			return

		logger.log {}, "Init metrics router"

		privateApiRouter.get(
			'/user/:user_id/v1/metrics_segmentation',
			AuthenticationController.httpAuth,
			MetricsController.metricsSegmentation
		)
