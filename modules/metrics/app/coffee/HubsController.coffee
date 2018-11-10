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

			HubsController._signupData(id, (err, response, body)->
				if !err
					usageData = body
				else
					usageData = null
				# fetch recent usage data from analytics
				recent_usage_path = "/recentInstitutionActivity?institution_id=#{id}"
				request.get({
					url: settings.apis.analytics.url + recent_usage_path,
					json: true
				}, (err, response, body)->
					if !err && response.statusCode == 200
						recentActivity = HubsController._format_recent_activity(body)
					else
						recentActivity = []
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
		id = req.entity.v1Id
		url = "#{settings.apis.v1.url}/api/v2/institutions/#{id}/external_collaboration_data"
		request.get({
			url: url,
			auth: { user: settings.apis.v1.user, pass: settings.apis.v1.pass }
    }, (err, response, body)->
			res.send(body)
		)

	_format_recent_activity: (data) ->
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
		console.log(recentActivity)
		return recentActivity

	_signupData: (id, callback) ->
		# fetch signup data from v1
		date = new Date()
		endDate = date.getTime()
		startDate = date.setMonth(date.getMonth() - 1)
		query = "?start_date=#{startDate}&end_date=#{endDate}"
		signupUrl = "#{settings.apis.v1.url}/api/v2/institutions/#{id}/usage_signup_data?#{query}"
		request {
			url: signupUrl
			auth: { user: settings.apis.v1.user, pass: settings.apis.v1.pass }
			json: true
		}, (err, response, body) ->
			callback(err, response, body)
