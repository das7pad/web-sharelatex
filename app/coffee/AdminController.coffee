logger = require "logger-sharelatex"
metrics = require "metrics-sharelatex"
_ = require "underscore"
Path = require("path")
User = require("../../../../app/js/models/User").User
perPage = 5

module.exports = AdminController =
	renderAdminPanel : (req, res, next) ->
		res.render Path.resolve(__dirname, "../views/admin"),
			title: 'Admin Panel'

	listUsers: (req, res, next)->
		logger.log "getting request for list if users"
		AdminController._userFind '', 0, (err, users, count)->
			if err?
				return next(err)
			pages = count / perPage
			res.render Path.resolve(__dirname, "../views/listUsers"), users:users, pages:pages

	searchUsers: (req, res, next)->
		logger.log body: req.body, "getting request for search users"
		AdminController._userFind req.body.query, req.body.page, (err, users, count) ->
			if err?
				return next(err)
			pages = count / perPage
			res.send 200, {users:users ,pages:pages}

	_userFind: (q, s, cb) ->
		q = [ {email:new RegExp(q)}, {name:new RegExp(q)} ]
		opts = {limit: perPage, skip : s}
		User.find {$or : q}, 'first_name email lastLoggedIn', opts, (err, users)->
			if err?
				logger.err err:err, "error getting data for users list page"
				return cb(err)
			User.count {$or : q}, (err, count)->
				if err?
					logger.err err:err, "error counting data for users list page"
					return cb(err)
				cb(err, users, count)

