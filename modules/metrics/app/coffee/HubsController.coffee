settings = require 'settings-sharelatex'
request = require 'request'
Path = require("path")
InstitutionsGetter = require '../../../../app/js/Features/Institutions/InstitutionsGetter'
logger = require 'logger-sharelatex'

module.exports = HubsController =

	institutionHub: (req, res, next) ->
		id = req.entity.v1Id
		# get general university metadata from v1
		url = "#{settings.apis.v1.url}/universities/list/#{id}"
		request.get(url, (err, response, body)->
			if !err
				data = JSON.parse(body)
				institutionName = data.name
				portalSlug = data.portal_slug
			else
				institutionName = null
				portalSlug = null
			# fetch signup data from v1
			HubsController._usageData(id, (usageData)->
				# fetch recent usage data from analytics
				HubsController._recentActivity(id, (recentActivity) ->
					res.render Path.resolve(__dirname, '../views/institutionHub.pug'), {
						institutionId: id,
						institutionName: institutionName,
						portalSlug: portalSlug,
						resourceType: 'institution',
						usageData: usageData,
						recentActivity: recentActivity
					}
				)
			)
		)

	institutionExternalCollaboration: (req, res, next) ->
		HubsController._v1InstitutionsApi(req.entity.v1Id, 'external_collaboration_data', (err, response, body)->
			res.send(body)
		)

	institutionDepartments: (req, res, next) ->
		HubsController._v1InstitutionsApi(req.entity.v1Id, 'departments_data', (err, response, body)->
			res.send(body)
		)

	institutionRoles: (req, res, next) ->
		HubsController._v1InstitutionsApi(req.entity.v1Id, 'roles_data', (err, response, body)->
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
				callback(HubsController._formatRecentActivity(body))
			else
				callback([])

	_formatRecentActivity: (data) ->
		recentActivity = []
		if data['month']['users'] + data['month']['projects'] == 0
			return recentActivity
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
		endDate = date.getTime()
		startDate = date.setMonth(date.getMonth() - 1)
		query = "?start_date=#{startDate}&end_date=#{endDate}"
		endpoint = "usage_signup_data#{query}"
		HubsController._v1InstitutionsApi(id, endpoint, (err, response, body) ->
			if !err
				callback(body)
			else
				callback(null)
		)
