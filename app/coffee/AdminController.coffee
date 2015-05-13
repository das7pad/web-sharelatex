logger = require "logger-sharelatex"
metrics = require "metrics-sharelatex"
_ = require "underscore"
Path = require("path")
UserGetter = require "../../../../app/js/Features/User/UserGetter"
UserDeleter = require("../../../../app/js/Features/User/UserDeleter")
AuthenticationManager = require("../../../../app/js/Features/Authentication/AuthenticationManager")

mongojs = require("../../../../app/js/infrastructure/mongojs")
db = mongojs.db
ObjectId = mongojs.ObjectId

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
		db.users.find {$or : q}, {first_name:1, email:1, lastLoggedIn:1, loginCount:1}, opts,(err, users)->
			if err?
				logger.err err:err, "error getting admin data for users list page"
				return cb(err)
			db.users.count {$or : q}, (err, count)->
				if err?
					logger.err err:err, "error counting admin data for users list page"
					return cb(err)
				cb(err, users, count)
				
	getUserInfo: (req, res, next)->
		logger.log "getting admin request for user info"
		UserGetter.getUser req.params.user_id, { _id:1, first_name:1, last_name:1, email:1}, (err, user) ->
			db.projects.find {owner_ref:ObjectId(req.params.user_id)}, {name:1, lastUpdated:1, publicAccesLevel:1, archived:1, owner_ref:1}, (err, projects) ->
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

	_genGraph: (relations) ->
		nodes = []
		edges = []

		for edge in relations
			nodes = AdminController._addNode nodes, edge.owner_ref.toString(), ''
			for ref in edge.readOnly_refs
				nodes = AdminController._addNode nodes, ref.toString(), ''
				edges.push({id:Math.random().toString(), source: edge.owner_ref, target: ref})
			for ref in edge.collaberator_refs
				nodes = AdminController._addNode nodes, ref.toString(), ''
				edges.push({id:Math.random().toString(), source: edge.owner_ref, target: ref})

		return {nodes:nodes, edges:edges}

	_addNode: (nodes, ref, name) ->
		exists = false
		coord = nodes.length

		for node in nodes
			if node.id == ref
				exists = true
				break

		if !exists
			nodes.push({id:ref,label:ref, x:coord, y:coord, size: 2});
			
		return nodes

	userGraph: (req, res, next)->
		logger.log "getting admin request for user graph"
		UserGetter.getUser req.params.user_id, { _id:1, first_name:1, last_name:1, email:1}, (err, user) ->
			db.projects.find {owner_ref:ObjectId(req.params.user_id)}, {_id:1, owner_ref:1, readOnly_refs:1, collaberator_refs:1}, (err, relations) ->
					if err?
						return next(err)
					graph = AdminController._genGraph relations
					logger.log graph:graph, "graph"
					res.render Path.resolve(__dirname, "../views/userGraph"), user:user, graph:graph
