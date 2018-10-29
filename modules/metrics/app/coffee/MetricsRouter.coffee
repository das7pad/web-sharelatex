logger = require 'logger-sharelatex'
MetricsController = require './MetricsController'
AnalyticsController = require("../../../../app/js/Features/Analytics/AnalyticsController")
AuthenticationController = require("../../../../app/js/Features/Authentication/AuthenticationController")
AuthorizationMiddlewear = require('../../../../app/js/Features/Authorization/AuthorizationMiddlewear')
UserMembershipAuthorization = require('../../../../app/js/Features/UserMembership/UserMembershipAuthorization')
settings = require 'settings-sharelatex'

module.exports =
	apply: (webRouter, privateApiRouter, publicApiRouter) ->

		if !settings?.apis?.v1?.url?
			logger.log {},
				"Overleaf v1 api settings not configured, skipping metrics router"
			return

		logger.log {}, "Init metrics router"

		webRouter.get(
			'/metrics/teams/:id/?(:startDate/:endDate)?',
			UserMembershipAuthorization.requireEntityAccess('team'),
			MetricsController.teamMetrics
		)

		webRouter.get(
			'/metrics/institutions/:id/?(:startDate/:endDate)?',
			UserMembershipAuthorization.requireEntityAccess('institution'),
			MetricsController.institutionMetrics
		)

		webRouter.get(
			'/graphs/licences',
			AuthorizationMiddlewear.ensureUserIsSiteAdmin,
			AnalyticsController.licences
		)

		webRouter.get(
			'/graphs/(:graph)?',
			(req, res, next) ->
				UserMembershipAuthorization.requireEntityAccess(
					req.query.resource_type,
					req.query.resource_id
				)(req, res, next)
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
