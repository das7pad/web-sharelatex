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
		AdminController._userFind '', 1, 'first_name', false, (err, users, count)->
			if err?
				return next(err)
			pages = Math.ceil(count / perPage)
			res.render Path.resolve(__dirname, "../views/listUsers"), users:users, pages:pages

	searchUsers: (req, res, next)->
		logger.log body: req.body, "getting request for search users"
		AdminController._userFind req.body.query, req.body.page, req.body.sort, req.body.reverse, (err, users, count) ->
			if err?
				return next(err)
			pages = Math.ceil(count / perPage)
			res.send 200, {users:users, pages:pages}

	_userFind: (q, page, sortField, reverse, cb) ->
		q = [ {email:new RegExp(q)}, {name:new RegExp(q)} ]
		skip = (page - 1) * perPage
		sortOrder = {}
		sortOrder[sortField] = if reverse then -1 else 1
		opts = {limit: perPage, skip : skip, sort: sortOrder }
		logger.log opts:opts, q:q, "user options and query"
		User.find {$or : q}, 'first_name email lastLoggedIn', opts, (err, users)->
			if err?
				logger.err err:err, "error getting data for users list page"
				return cb(err)
			User.count {$or : q}, (err, count)->
				if err?
					logger.err err:err, "error counting data for users list page"
					return cb(err)
				cb(err, users, count)

