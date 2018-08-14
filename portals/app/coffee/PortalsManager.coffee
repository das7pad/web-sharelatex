_ = require 'lodash'
path = require 'path'
request = require 'request'
settings = require 'settings-sharelatex'

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
				callback null, httpResponse.body