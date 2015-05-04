logger = require "logger-sharelatex"
metrics = require "metrics-sharelatex"
_ = require "underscore"
Path = require("path")
User = require("../../../../app/js/models/User").User
UserGetter = require "../../../../app/js/Features/User/UserGetter"
Project = require("../../../../app/js/models/Project").Project

module.exports = AdminController =
	perPage: 5

	renderAdminPanel : (req, res, next) ->
		res.render Path.resolve(__dirname, "../views/admin"),
			title: 'Admin Panel'

	listUsers: (req, res, next)->
		logger.log "getting request for adimin list of users"
		AdminController._userFind '', 1, 'first_name', false, (err, users, count)->
			if err?
				return next(err)
			pages = Math.ceil(count / AdminController.perPage)
			res.render Path.resolve(__dirname, "../views/listUsers"), users:users, pages:pages

	searchUsers: (req, res, next)->
		logger.log body: req.body, "getting request for admin search users"
		AdminController._userFind req.body.query, req.body.page, req.body.sort, req.body.reverse, (err, users, count) ->
			if err?
				return next(err)
			pages = Math.ceil(count / AdminController.perPage)
			res.send 200, {users:users, pages:pages}

	_userFind: (q, page, sortField, reverse, cb) ->
		q = [ {email:new RegExp(q)}, {name:new RegExp(q)} ]
		skip = (page - 1) * AdminController.perPage
		sortOrder = {}
		sortOrder[sortField] = if reverse then -1 else 1
		opts = {limit: AdminController.perPage, skip : skip, sort: sortOrder }
		logger.log opts:opts, q:q, "user options and query"
		User.find {$or : q}, 'first_name email lastLoggedIn', opts, (err, users)->
			if err?
				logger.err err:err, "error getting data for admin users list page"
				return cb(err)
			User.count {$or : q}, (err, count)->
				if err?
					logger.err err:err, "error counting data for admin users list page"
					return cb(err)
				cb(err, users, count)
				
	getUserInfo: (req, res, next)->
		logger.log "getting request for admin user info"
		UserGetter.getUser req.params.user_id, { _id: true, first_name: true, last_name: true, email: true}, (err, user) ->
			Project.findAllUsersProjects req.params.user_id, 'name lastUpdated publicAccesLevel archived owner_ref', (err, projects) ->
					if err?
						return next(err)
					res.render Path.resolve(__dirname, "../views/userInfo"), user:user, projects:projects

