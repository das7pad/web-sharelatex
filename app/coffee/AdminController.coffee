logger = require "logger-sharelatex"
metrics = require "metrics-sharelatex"
_ = require "underscore"
Path = require("path")
User = require("../../../../app/js/models/User").User
UserGetter = require "../../../../app/js/Features/User/UserGetter"
Project = require("../../../../app/js/models/Project").Project
UserDeleter = require("../../../../app/js/Features/User/UserDeleter")
AuthenticationManager = require("../../../../app/js/Features/Authentication/AuthenticationManager")

module.exports = AdminController =
	perPage: 5

	renderAdminPanel : (req, res, next) ->
		res.render Path.resolve(__dirname, "../views/admin"),
			title: 'Admin Panel'

	listUsers: (req, res, next)->
		logger.log "getting admin request for list of users"
		AdminController._userFind '', 1, 'first_name', false, (err, users, count)->
			if err?
				return next(err)
			pages = Math.ceil(count / AdminController.perPage)
			res.render Path.resolve(__dirname, "../views/listUsers"), users:users, pages:pages

	searchUsers: (req, res, next)->
		logger.log body: req.body, "getting admin request for search users"
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
				logger.err err:err, "error getting admin data for users list page"
				return cb(err)
			User.count {$or : q}, (err, count)->
				if err?
					logger.err err:err, "error counting admin data for users list page"
					return cb(err)
				cb(err, users, count)
				
	getUserInfo: (req, res, next)->
		logger.log "getting admin request for user info"
		UserGetter.getUser req.params.user_id, { _id: true, first_name: true, last_name: true, email: true}, (err, user) ->
			Project.findAllUsersProjects req.params.user_id, 'name lastUpdated publicAccesLevel archived owner_ref', (err, projects) ->
					if err?
						return next(err)
					res.render Path.resolve(__dirname, "../views/userInfo"), user:user, projects:projects

	deleteUser: (req, res)->
		user_id = req.params.user_id
		logger.log user_id: user_id, "received admin request to delete user"
		UserDeleter.deleteUser user_id, (err)->
			if err?
				res.send 500
			else
				res.send 200

	setUserPassword: (req, res)->
		user_id = req.params.user_id
		password = req.body.newPassword
		logger.log user_id: user_id, "received admin request to set user password"
		AuthenticationManager.setUserPassword user_id, password, (err)->
			if err?
				res.send 500
			else
				res.send 200
