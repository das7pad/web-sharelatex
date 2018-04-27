request = require('request')
settings = require('settings-sharelatex')

module.exports = PublishModalController =

	list: (req, res)->
		url = "#{settings.apis.v1.url}/journals/v2"
		request.get(url, (err, response, body)->
			res.send(body)
		)
