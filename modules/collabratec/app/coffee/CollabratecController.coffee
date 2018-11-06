Path = require "path"
CollabratecManager = require "./CollabratecManager"
Settings = require 'settings-sharelatex'

module.exports = CollabratecController =

	getProjects: (req, res, next) ->
		page = parseInt(req.query.page) || 1
		page_size = parseInt(req.query.page_size) || 30
		CollabratecManager.getProjects req.oauth_user, req.token, page, page_size, req.query.search, (err, response) ->
			return res.status(err.statusCode).send('') if err? && 400 <= err.statusCode <= 403
			return next err if err?
			res.json response
