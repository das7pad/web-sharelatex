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
			console.log(body)
			if !err
				data = JSON.parse(body)
				institutionName = data.name
				portalSlug = data.portal_slug
			else
				institutionName = null
				portalSlug = null

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
			}, (err, response, body)->
				if !err
					usageData = body
				else
					usageData = null
				# fetch recent usage data from analytics
				console.log(body)

				res.render Path.resolve(__dirname, '../views/institutionHub.pug'), {
					institutionId: id,
					institutionName: institutionName,
					portalSlug: portalSlug,
					resourceType: 'institution',
					usageData: usageData
				}
		)
    
