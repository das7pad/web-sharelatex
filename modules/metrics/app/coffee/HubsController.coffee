settings = require 'settings-sharelatex'
request = require 'request'
Path = require("path")
InstitutionsGetter = require '../../../../app/js/Features/Institutions/InstitutionsGetter'
logger = require 'logger-sharelatex'

module.exports = HubsController =

	institutionHub: (req, res, next) ->
		id = req.entity.v1Id
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

			res.render Path.resolve(__dirname, '../views/institutionHub.pug'), {
				institutionId: id,
				institutionName: institutionName,
				portalSlug: portalSlug,
				resourceType: 'institution'
			}
		)
    
