logger = require 'logger-sharelatex'
MetricsController = require './MetricsController'
AuthenticationController = require("../../../../app/js/Features/Authentication/AuthenticationController")
AuthorizationMiddlewear = require('../../../../app/js/Features/Authorization/AuthorizationMiddlewear')
settings = require 'settings-sharelatex'

module.exports =
	apply: (webRouter, privateApiRouter, publicApiRouter) ->

		if !settings?.apis?.v1?.url?
			logger.log {},
				"Overleaf v1 api settings not configured, skipping metrics router"
			return

		logger.log {}, "Init metrics router"

		webRouter.get(
			'/metrics/teams/:teamId/?(:startDate/:endDate)?',
			AuthorizationMiddlewear.ensureUserIsSiteAdmin,
			MetricsController.teamMetrics
		)

		webRouter.get(
			'/graphs/',
			AuthorizationMiddlewear.ensureUserIsSiteAdmin,
			MetricsController.analyticsProxy
		)

		webRouter.get(
			'/graphs/:graph',
			AuthorizationMiddlewear.ensureUserIsSiteAdmin,
			MetricsController.analyticsProxy
		)

		privateApiRouter.get(
			'/user/:user_id/v1/metrics_segmentation',
			AuthenticationController.httpAuth,
			MetricsController.userMetricsSegmentation
		)

		privateApiRouter.get(
			'/project/:project_id/v1/metrics_segmentation',
			AuthenticationController.httpAuth,
			MetricsController.projectMetricsSegmentation
		)
