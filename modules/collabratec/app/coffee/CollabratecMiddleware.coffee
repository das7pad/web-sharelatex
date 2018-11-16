V1Api = require "../../../../app/js/Features/V1/V1Api"
mongojs = require "mongojs"

module.exports = CollabratecMiddlewear =
	v1Proxy: (req, res, next) ->
		# use v2 if feature flag is set and this is either not a project
		# route or this is a project route and the project is v2
		return next() if req.oauth_user.useCollabratecV2 && (!req.params.project_id? || mongojs.ObjectId.isValid(req.params.project_id))
		# proxy to v1 for all users without feature flag and for v1 projects
		CollabratecMiddlewear._v1Proxy req, res, next

	_v1Proxy: (req, res, next) ->
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
