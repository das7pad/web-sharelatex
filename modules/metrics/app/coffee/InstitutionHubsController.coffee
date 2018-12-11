settings = require 'settings-sharelatex'
request = require 'request'
Path = require("path")
InstitutionsGetter = require '../../../../app/js/Features/Institutions/InstitutionsGetter'
logger = require 'logger-sharelatex'

module.exports = InstitutionHubsController =

	institutionHub: (req, res, next) ->
		{entity} = req
		id = entity.v1Id
		entity.fetchV1Data (error, entity) ->
			if !error
				institutionName = entity.name
				portalSlug = entity.portalSlug
			else
				institutionName = null
				portalSlug = null
			# fetch signup data from v1
			InstitutionHubsController._usageData(id, (usageData)->
				# fetch recent usage data from analytics
				InstitutionHubsController._recentActivity(id, (recentActivity) ->
					res.render Path.resolve(__dirname, '../views/institutionHub.pug'), {
						institutionId: id,
						institutionName: institutionName,
						portalSlug: portalSlug,
						usageData: usageData,
						recentActivity: recentActivity
					}
				)
			)

	institutionExternalCollaboration: (req, res, next) ->
		InstitutionHubsController._v1InstitutionsApi(req.entity.v1Id, 'external_collaboration_data', (err, response, body)->
			return next(err) if err?
			res.send(body)
		)

	institutionDepartments: (req, res, next) ->
		InstitutionHubsController._v1InstitutionsApi(req.entity.v1Id, 'departments_data', (err, response, body)->
			return next(err) if err?
			res.send(body)
		)

	institutionRoles: (req, res, next) ->
		InstitutionHubsController._v1InstitutionsApi(req.entity.v1Id, 'roles_data', (err, response, body)->
			return next(err) if err?
			res.send(body)
		)

	_v1InstitutionsApi: (id, endpoint, callback) ->
		url = "#{settings.apis.v1.url}/api/v2/institutions/#{id}/#{endpoint}"
		request.get {
			url: url,
			auth: { user: settings.apis.v1.user, pass: settings.apis.v1.pass }
			json: true
		}, (err, response, body) ->
			callback(err, response, body)

	_recentActivity: (id, callback) ->
		recent_usage_path = "/recentInstitutionActivity?institution_id=#{id}"
		request.get {
			url: settings.apis.analytics.url + recent_usage_path,
			json: true
		}, (err, response, body) ->
			if !err && response.statusCode == 200
				callback(InstitutionHubsController._formatRecentActivity(body))
			else
				callback(null)

	_formatRecentActivity: (data) ->
		recentActivity = []
		if data['month']['users'] + data['month']['projects'] == 0
			return null
		lags = { day: 'Yesterday', week: 'Last Week', month: 'Last Month' }
		for lag, title of lags
			recentActivity.push(
				title: title,
				users: data[lag]['users'],
				docs: data[lag]['projects']
			)
		return recentActivity

	_usageData: (id, callback) ->
		# fetch signup data from v1
		date = new Date()
		endDate = Math.round(date.getTime() / 1000)
		startDate = Math.round(date.setMonth(date.getMonth() - 1) / 1000)
		query = "?start_date=#{startDate}&end_date=#{endDate}"
		endpoint = "usage_signup_data#{query}"
		InstitutionHubsController._v1InstitutionsApi(id, endpoint, (err, response, body) ->
			if !err
				callback(body)
			else
				callback(null)
		)
