logger = require 'logger-sharelatex'
MetricsController = require './MetricsController'
InstitutionHubsController = require './InstitutionHubsController'
PublisherHubsController = require './PublisherHubsController'
MetricsEmailController = require './MetricsEmailController'
AnalyticsController = require("../../../../app/js/Features/Analytics/AnalyticsController")
AuthenticationController = require("../../../../app/js/Features/Authentication/AuthenticationController")
AuthorizationMiddleware = require('../../../../app/js/Features/Authorization/AuthorizationMiddleware')
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
			UserMembershipAuthorization.requireTeamMetricsAccess,
			MetricsController.teamMetrics
		)

		webRouter.get(
			'/metrics/groups/:id/?(:startDate/:endDate)?',
			UserMembershipAuthorization.requireGroupMetricsAccess,
			(req, res, next) ->
				if req.entity.overleaf?.id?
					MetricsController.teamMetrics(req, res, next)
				else
					MetricsController.groupMetrics(req, res, next)
		)

		webRouter.get(
			'/metrics/institutions/:id/?(:startDate/:endDate)?',
			UserMembershipAuthorization.requireInstitutionMetricsAccess,
			MetricsController.institutionMetrics
		)

		webRouter.get(
			'/metrics/templates/:id/?(:startDate/:endDate)?',
			UserMembershipAuthorization.requireTemplateMetricsAccess,
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
			'/metrics/csv',
			UserMembershipAuthorization.requireGraphAccess,
			MetricsController.analyticsProxy
		)

		webRouter.get(
			'/institutions/:id/hub',
			UserMembershipAuthorization.requireInstitutionMetricsAccess,
			InstitutionHubsController.institutionHub
		)

		webRouter.get(
			'/institutions/:id/usersCSV',
			UserMembershipAuthorization.requireInstitutionMetricsAccess,
			InstitutionHubsController.institutionUsersCSV
		)

		webRouter.get(
			'/institutions/:id/externalCollaboration',
			UserMembershipAuthorization.requireInstitutionMetricsAccess,
			InstitutionHubsController.institutionExternalCollaboration
		)

		webRouter.get(
			'/institutions/:id/departments',
			AuthenticationController.requireLogin(),
			InstitutionHubsController.institutionDepartments
		)

		webRouter.get(
			'/institutions/:id/roles',
			UserMembershipAuthorization.requireInstitutionMetricsAccess,
			InstitutionHubsController.institutionRoles
		)

		webRouter.post(
			'/institutions/:id/emailSubscription',
			UserMembershipAuthorization.requireInstitutionMetricsAccess,
			MetricsEmailController.updateSubscription
		)

		webRouter.get(
			'/publishers/:id/hub',
			UserMembershipAuthorization.requirePublisherMetricsAccess,
			PublisherHubsController.publisherHub
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

		privateApiRouter.post(
			'/metrics/institutional_emails',
			AuthenticationController.httpAuth,
			MetricsEmailController.sendAll
		)
