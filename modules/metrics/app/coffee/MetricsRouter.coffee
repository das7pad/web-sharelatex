logger = require 'logger-sharelatex'
MetricsController = require './MetricsController'
HubsController = require './HubsController'
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
			UserMembershipAuthorization.requireTeamAccess,
			MetricsController.teamMetrics
		)

		webRouter.get(
			'/metrics/groups/:id/?(:startDate/:endDate)?',
			UserMembershipAuthorization.requireGroupAccess,
			(req, res, next) ->
				if req.entity.overleaf?.id?
					MetricsController.teamMetrics(req, res, next)
				else
					MetricsController.groupMetrics(req, res, next)
		)

		webRouter.get(
			'/metrics/institutions/:id/?(:startDate/:endDate)?',
			UserMembershipAuthorization.requireInstitutionAccess,
			MetricsController.institutionMetrics
		)

		webRouter.get(
			'/metrics/templates/:id/?(:startDate/:endDate)?',
			UserMembershipAuthorization.requireTemplateAccess,
			MetricsController.templateMetrics
		)

		webRouter.get(
			'/graphs/licences',
			UserMembershipAuthorization.requireGraphAccess,
			AnalyticsController.licences
		)

		webRouter.get(
			'/graphs/(:graph)?',
			UserMembershipAuthorization.requireGraphAccess,
			MetricsController.analyticsProxy
		)

		webRouter.get(
			'/institutions/:id/hub',
			UserMembershipAuthorization.requireInstitutionAccess,
			HubsController.institutionHub
		)

		webRouter.get(
			'/institutions/:id/externalCollaboration',
			UserMembershipAuthorization.requireInstitutionAccess,
			HubsController.institutionExternalCollaboration
		)

		webRouter.get(
			'/institutions/:id/departments',
			UserMembershipAuthorization.requireInstitutionAccess,
			HubsController.institutionDepartments
		)

		webRouter.get(
			'/institutions/:id/roles',
			UserMembershipAuthorization.requireInstitutionAccess,
			HubsController.institutionRoles
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
