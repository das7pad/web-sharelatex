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

module.exports = UserController =
	ATTRIBUTES: [{
		name: 'betaProgram',
		type: 'boolean'
	}, {
		name: 'first_name',
		type: 'string'
	}, {
		name: 'last_name',
		type: 'string'
	}, {
		name: 'features.collaborators'
		type: 'number'
	}, {
		name: 'features.versioning'
		type: 'boolean'
	}, {
		name: 'features.dropbox'
		type: 'boolean'
	}, {
		name: 'features.github'
		type: 'boolean'
	}, {
		name: 'features.compileTimeout'
		type: 'number'
	}, {
		name: 'features.compileGroup'
		type: 'string'
	}, {
		name: 'features.templates'
		type: 'boolean'
	}, {
		name: 'features.trackChanges'
		type: 'boolean'
	}, {
		name: 'features.references'
		type: 'boolean'
	}]

	perPage: 5
	perSearch: 15

	index: (req, res, next)->
		logger.log "getting admin request for list of users"
		UserController._userFind '', 1, '_id', false, (err, users, count)->
			if err?
				return next(err)
			pages = Math.ceil(count / UserController.perPage)
			res.render Path.resolve(__dirname, "../views/user/index"), users:users, pages:pages

	search: (req, res, next)->
		logger.log body: req.body, "getting admin request for search users"
		UserController._userFind req.body.query, req.body.page, req.body.sort, req.body.reverse, (err, users, count) ->
			if err?
				return next(err)
			pages = Math.ceil(count / UserController.perPage)
			res.send 200, {users:users, pages:pages}

	_userFind: (q, page, sortField, reverse, cb) ->
		q = [ {email:new RegExp(q)}, {name:new RegExp(q)} ]
		skip = (page - 1) * UserController.perPage
		sortOrder = {}
		sortOrder[sortField] = if reverse then -1 else 1
		opts = {limit: UserController.perSearch, skip : skip, sort: sortOrder }
		logger.log opts:opts, q:q, "user options and query"
		db.users.find {$or : q}, {first_name:1, email:1, lastLoggedIn:1, loginCount:1}, opts, (err, users)->
			if err?
				logger.err err:err, "error getting admin data for users list page"
				return cb(err)
			logger.log opts:opts, q:q, users_length:users?.length, "found users for admin search"
			cb(err, users, users.length)

	show: (req, res, next)->
		logger.log "getting admin request for user info"
		UserGetter.getUser req.params.user_id, { _id:1, first_name:1, last_name:1, email:1, betaProgram:1, features: 1}, (err, user) ->
			db.projects.find {owner_ref:ObjectId(req.params.user_id)}, {name:1, lastUpdated:1, publicAccesLevel:1, archived:1, owner_ref:1}, (err, projects) ->
					if err?
						return next(err)
					res.render Path.resolve(__dirname, "../views/user/show"), user:user, projects:projects

	delete: (req, res)->
		user_id = req.params.user_id
		logger.log user_id: user_id, "received admin request to delete user"
		UserDeleter.deleteUser user_id, (err)->
			if err?
				res.sendStatus 500
			else
				res.sendStatus 200

	update: (req, res, net) ->
		user_id = req.params.user_id
		updateParams = { $set: {} }
		for attribute in UserController.ATTRIBUTES
			# Unticked checkboxes are not submitted
			if attribute.type == "boolean" and !req.body[attribute.name]? 
				req.body[attribute.name] = false
			# Value of a checkbox is 'on'
			if attribute.type == "boolean" and req.body[attribute.name] == "on"
				req.body[attribute.name] = true
			# Cast strings to numbers
			if attribute.type == "number" and req.body[attribute.name]?
				req.body[attribute.name] = parseInt(req.body[attribute.name], 10)

			if req.body[attribute.name]?
				if typeof req.body[attribute.name] == attribute.type
					updateParams.$set[attribute.name] = req.body[attribute.name]
				else
					return res.sendStatus 400
		db.users.update {_id: ObjectId(user_id)}, updateParams, (error) ->
			return next(error) if error?
			res.sendStatus 204
