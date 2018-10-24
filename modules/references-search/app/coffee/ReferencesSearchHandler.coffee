logger = require('logger-sharelatex')
request = require('request')
settings = require('settings-sharelatex')

oneMinInMs = 60 * 1000
fiveMinsInMs = oneMinInMs * 5

module.exports = ReferencesSearchHandler =

	search: (projectId, query, callback=(err, hits)->) ->
		logger.log {projectId, query}, "sending search request to references search backend"
		request.get {
			url: "#{settings.apis.references.url}/project/#{projectId}/search?q=#{query}"
			json: true
		}, (err, res, data) ->
			if err
				logger.err {err, projectId}, "error communicating with references api"
				return callback(err)
			if 200 <= res.statusCode < 300
				logger.log {projectId}, "got search results from references api"
				return callback(null, data)
			else
				err = new Error("references api responded with non-success code: #{res.statusCode}")
				logger.log {err, projectId}, "error searching references"
				return callback(err)
