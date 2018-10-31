V1Api = require "../../../../app/js/Features/V1/V1Api"
mongojs = require "mongojs"

module.exports = CollabratecMiddlewear =
	v1ProjectProxy: (req, res, next) ->
		return next() if mongojs.ObjectId.isValid(req.params.project_id)
		options =
			json: req.body
			method: req.method
			uri: req.originalUrl
		V1Api.oauthRequest options, req.token, (err, response, body) ->
			return res.sendStatus(err.statusCode) if err? && 400 <= err.statusCode <= 404
			return next err if err?
			res.status response.statusCode
			if typeof body == "object"
				res.json body
			else
				res.send body
