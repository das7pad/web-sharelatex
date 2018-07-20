settings = require 'settings-sharelatex'
request = require 'request'
mongoose = require('mongoose')
Path = require("path")
async = require 'async'
_ = require 'lodash'
UserGetter = require '../../../../app/js/Features/User/UserGetter'
ProjectGetter = require '../../../../app/js/Features/Project/ProjectGetter'
SubscriptionLocator = require '../../../../app/js/Features/Subscription/SubscriptionLocator'
logger = require 'logger-sharelatex'

module.exports = MetricsController =

	teamMetrics: (req, res, next) ->
		res.render Path.resolve(__dirname, '../views/metricsApp'), {
			metricsEndpoint: "/graphs",
			resourceId: req.params.teamId,
			resourceType: 'team',
		}

	institutionMetrics: (req, res, next) ->
		res.render Path.resolve(__dirname, '../views/metricsApp'), {
			metricsEndpoint: "/graphs",
			resourceId: req.params.institutionId,
			resourceType: 'institution',
		}

	analyticsProxy: (req, res, next) ->
		analyticsUrl = settings.apis.analytics.url + req.originalUrl
		logger.log req.query, "requesting from analytics #{analyticsUrl}"
		request
			.get(analyticsUrl)
			.on('error', (err) => next(err))
			.pipe(res)

	userMetricsSegmentation: (req, res, next) ->
		userId = req.params.user_id

		if !userId?
			return next(new Error('[V1Segmentation] user_id required'))

		if !mongoose.Types.ObjectId.isValid(userId)
			# Not a valid user id. This can happen because we use the userId field to
			# also store session ids.
			return res.sendStatus(404)

		async.parallel([
			(callback) -> MetricsController._getV1Segmentation(userId, callback)
			(callback) -> SubscriptionLocator.getMemberSubscriptions(userId, callback)
		],
		(err, results) ->
			return next(err) if err?

			segmentation  = results[0] || {}
			subscriptions = results[1] || []

			segmentation['teams'] = mergeTeams(segmentation.teamIds, subscriptions)

			res.json segmentation
		)

	projectMetricsSegmentation: (req, res, next) ->
		projectId = req.params.project_id
		if !projectId?
			return next(new Error('[V1Segmentation] project_id required'))
		ProjectGetter.getProject projectId, {
			fromV1TemplateId: 1,
			fromV1TemplateVersionId: 1,
		}, (err, project) ->
			if err?
				return next(err)
			if !project?
				return res.sendStatus(404)
			result = {
				projectId: projectId,
				v1TemplateId: project.fromV1TemplateId || null
				v1TemplateVersionId: project.fromV1TemplateVersionId || null,
			}
			res.json(result)

	_getV1Segmentation: (userId, callback) ->
		UserGetter.getUser userId, {overleaf: 1}, (err, user) ->
			return callback(err) if err?

			v1_userId = user?.overleaf?.id

			if !v1_userId?
				return callback(null, null)

			request {
				method: 'GET',
				url: settings.apis.v1.url +
					"/api/v1/sharelatex/users/#{v1_userId}/metrics_segmentation",
				auth:
					user: settings.apis.v1.user
					pass: settings.apis.v1.pass
				json: true,
				timeout: 5 * 1000
			}, (err, response, body) ->
				if err?
					return callback(err)
				statusCode = response.statusCode
				if statusCode >= 200 and statusCode < 300
					return callback(null, body)
				else
					err = new Error(
						"[V1Segmentation] got non-200 response from v1: #{statusCode}"
					)
					logger.err {err, userId}, err.message
					return callback(err)


mergeTeams = (v1TeamIds, v2Teams) ->
	v2Teams = v2Teams.map (t) ->
		v2Team = { v2Id: t.id }
		v2Team.v1Id = t.overleaf?.id if t.overleaf?.id?
		v2Team

	v1Teams = v1TeamIds.map (id) -> { v1Id: id }

	teams = v2Teams.concat(v1Teams)

	# remove v1 teams that have already been imported to v2.
	# uniqBy takes the first occurrence, if there's more than one
	_.uniqBy teams, (t) -> t.v1Id || t.v2Id
