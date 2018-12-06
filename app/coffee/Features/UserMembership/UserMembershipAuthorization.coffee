AuthenticationController = require('../Authentication/AuthenticationController')
AuthorizationMiddlewear = require('../Authorization/AuthorizationMiddlewear')
UserMembershipHandler = require('./UserMembershipHandler')
EntityConfigs = require('./UserMembershipEntityConfigs')
Errors = require('../Errors/Errors')
logger = require("logger-sharelatex")
settings = require 'settings-sharelatex'
request = require 'request'

module.exports = UserMembershipAuthorization =
	requireTeamAccess: (req, res, next) ->
		requireAccessToEntity('team', req.params.id, req, res, next)

	requireGroupAccess: (req, res, next) ->
		requireAccessToEntity('group', req.params.id, req, res, next)

	requireGroupManagersAccess: (req, res, next) ->
		requireAccessToEntity('groupManagers', req.params.id, req, res, next)

	requireInstitutionAccess: (req, res, next) ->
		requireAccessToEntity('institution', req.params.id, req, res, next)

	requirePublisherAccess: (req, res, next) ->
		requireAccessToEntity('publisher', req.params.id, req, res, next)

	requireTemplateAccess: (req, res, next) ->
		templateId = req.params.id
		request {
			baseUrl: settings.apis.v1.url
			url: "/api/v2/templates/#{templateId}"
			method: 'GET'
			auth:
				user: settings.apis.v1.user
				pass: settings.apis.v1.pass
				sendImmediately: true
		}, (error, response, body) =>
			if response.statusCode == 404
				return next(new Errors.NotFoundError())

			if response.statusCode != 200
				logger.err { templateId }, "[TemplateMetrics] Couldn't fetch template data from v1"
				return next(new Error("Couldn't fetch template data from v1"))

			return next(error) if error?
			try
				body = JSON.parse(body)
			catch error
				return next(error)

			req.template =
				id: body.id
				title: body.title
			if body?.brand?.slug
				requireAccessToEntity('publisher', body.brand.slug, req, res, next)
			else
				AuthorizationMiddlewear.ensureUserIsSiteAdmin(req, res, next)

	requireGraphAccess: (req, res, next) ->
		if req.query.resource_type == 'template'
			# templates are a special case; can't use requireaccesstoentity directly
			req.params.id = req.query.resource_id
			return UserMembershipAuthorization.requireTemplateAccess(req, res, next)

		requireAccessToEntity(
			req.query.resource_type, req.query.resource_id, req, res, next
		)

requireAccessToEntity = (entityName, entityId, req, res, next) ->
	loggedInUser = AuthenticationController.getSessionUser(req)
	unless loggedInUser
		return AuthorizationMiddlewear.redirectToRestricted req, res, next

	getEntity entityName, entityId, loggedInUser, (error, entity, entityConfig) ->
		return next(error) if error?
		unless entity?
			return AuthorizationMiddlewear.redirectToRestricted(req, res, next)

		req.entity = entity
		req.entityConfig = entityConfig
		next()

getEntity = (entityName, entityId, userId, callback = (error, entity, entityConfig)->) ->
	entityConfig = EntityConfigs[entityName]
	unless entityConfig
		return callback(new Errors.NotFoundError("No such entity: #{entityName}"))

	UserMembershipHandler.getEntity entityId, entityConfig, userId, (error, entity)->
		return callback(error) if error?
		callback(null, entity, entityConfig)
