request = require('request')
settings = require('settings-sharelatex')
ProjectHistoryHandler = require '../../../../app/js/Features/Project/ProjectHistoryHandler'

module.exports = PublishModalController =

	list: (req, res)->
		url = "#{settings.apis.v1.url}/journals/v2"
		request.get(url, (err, response, body)->
			res.send(body)
		)

	listForBrand: (req, res)->
		brandId = req.params.brand_id
		url = "#{settings.apis.v1.url}/journals/v2/#{brandId}"
		request.get(url, (err, response, body)->
			res.send(body)
		)

	latestTemplate: (req, res)->
		projectId = req.params.project_id
		ProjectHistoryHandler.getHistoryId(projectId, (err, history_id) ->
			url = "#{settings.apis.v1.url}/api/v1/sharelatex/templates/latest/#{history_id}"
			request.get(url, {
				auth:
					user: settings.apis.v1.user
					pass: settings.apis.v1.pass
				json: true,
			}, (err, response, body) ->
				res.send(body)
			)
		)
