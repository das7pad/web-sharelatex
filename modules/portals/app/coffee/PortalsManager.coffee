_ = require 'lodash'
path = require 'path'
request = require 'request'
settings = require 'settings-sharelatex'
InstitutionHubsController = require '../../../metrics/app/js/InstitutionHubsController'

module.exports = PortalsManager =
	get: (path, callback) ->
		httpRequest =
			headers:
				Accept: 'application/json'
			json: true
			uri: settings.apis.v1.url+path+'.json'

		request httpRequest, (err, httpResponse) ->
			if err?
				callback err
			else
				data = httpResponse.body
				InstitutionHubsController._recentActivity data.university.id, (recentActivity) ->
					data.recentActivity = recentActivity
					callback null, data

