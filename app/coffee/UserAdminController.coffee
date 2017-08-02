logger = require "logger-sharelatex"
metrics = require "metrics-sharelatex"
_ = require "underscore"
Path = require("path")
UserGetter = require "../../../../app/js/Features/User/UserGetter"
UserDeleter = require("../../../../app/js/Features/User/UserDeleter")
UserUpdater = require("../../../../app/js/Features/User/UserUpdater")
{User} = require("../../../../app/js/models/User")
ProjectGetter = require "../../../../app/js/Features/Project/ProjectGetter"
AuthenticationManager = require("../../../../app/js/Features/Authentication/AuthenticationManager")
SubscriptionLocator = require("../../../../app/js/Features/Subscription/SubscriptionLocator")
async = require "async"

module.exports = UserAdminController =
	perPage: 5
	perSearch: 15

	index: (req, res, next)->
		logger.log "getting admin request for list of users"
		UserAdminController._userFind '', 1, '_id', false, (err, users, count)->
			if err?
				return next(err)
			pages = Math.ceil(count / UserAdminController.perPage)
			res.render Path.resolve(__dirname, "../views/user/index"), users:users, pages:pages

	search: (req, res, next)->
		logger.log body: req.body, "getting admin request for search users"
		UserAdminController._userFind req.body.query, req.body.page, req.body.sort, req.body.reverse, (err, users, count) ->
			if err?
				return next(err)
			pages = Math.ceil(count / UserAdminController.perPage)
			res.send 200, {users:users, pages:pages}

	_userFind: (q, page, sortField, reverse, cb = () ->) ->
		q = [ {email:new RegExp(q)}, {name:new RegExp(q)} ]
		skip = (page - 1) * UserAdminController.perPage
		sortOrder = {}
		sortOrder[sortField] = if reverse then -1 else 1
		opts = {limit: UserAdminController.perSearch, skip : skip, sort: sortOrder }
		logger.log opts:opts, q:q, "user options and query"
		User.find {$or : q}, {first_name:1, email:1, lastLoggedIn:1, loginCount:1}, opts, (err, users)->
			if err?
				logger.err err:err, "error getting admin data for users list page"
				return cb(err)
			logger.log opts:opts, q:q, users_length:users?.length, "found users for admin search"
			cb(err, users, users.length)

	show: (req, res, next)->
		user_id = req.params.user_id
		logger.log {user_id}, "getting admin request for user info"
		async.parallel {
			user: (cb) ->
				UserGetter.getUser user_id, {
					_id:1, first_name:1, last_name:1, email:1, betaProgram:1, features: 1
				}, cb
			projects: (cb) ->
				ProjectGetter.findAllUsersProjects user_id, {
					name:1, lastUpdated:1, publicAccesLevel:1, archived:1, owner_ref:1
				}, (err, owned = [], member = [], readOnly = []) ->
					return cb(err) if err?
					return cb(null, owned.concat(member).concat(readOnly))
			subscription: (cb) ->
				SubscriptionLocator.getUsersSubscription user_id, cb
			memberSubscriptions: (cb) ->
				SubscriptionLocator.getMemberSubscriptions user_id, cb
		}, (err, data) ->
			return next(err) if err?
			res.render Path.resolve(__dirname, "../views/user/show"), data

	delete: (req, res, next)->
		user_id = req.params.user_id
		logger.log user_id: user_id, "received admin request to delete user"
		UserDeleter.deleteUser user_id, (err)->
			return next(err) if err?
			res.sendStatus 200

	ALLOWED_ATTRIBUTES: [
		'betaProgram',
		'first_name',
		'last_name',
		'features.collaborators',
		'features.versioning',
		'features.dropbox',
		'features.github',
		'features.compileTimeout',
		'features.compileGroup',
		'features.templates',
		'features.trackChanges',
		'features.references'
	]
	BOOLEAN_ATTRIBUTES: [
		'betaProgram',
		'features.versioning',
		'features.dropbox',
		'features.github',
		'features.templates',
		'features.trackChanges',
		'features.references'
	]
	update: (req, res, next) ->
		user_id = req.params.user_id
		update = UserAdminController._reqToMongoUpdate(
			req.body,
			UserAdminController.ALLOWED_ATTRIBUTES,
			UserAdminController.BOOLEAN_ATTRIBUTES
		)
		User.update {_id: user_id}, { $set: update }, (err) ->
			return next(err) if err?
			res.sendStatus 204
	
	updateEmail: (req, res, next) ->
		user_id = req.params.user_id
		email = req.body.email
		UserUpdater.changeEmailAddress user_id, email, (err) ->
			if err?
				if err.message = "alread_exists"
					return res.send 400, {message: "Email is in use by another user"}
				else
					return next(err)
			else
				return res.sendStatus 204

	_reqToMongoUpdate: (body, attributes, booleans) ->
		update = {}
		for attribute in attributes
			if !body[attribute]? and (attribute in booleans)
				# Unticked checkboxes are not submitted
				update[attribute] = false
			else if body[attribute] == "on" and (attribute in booleans)
				# Value of a checkbox is sent as 'on'
				update[attribute] = true
			else if body[attribute]?
				update[attribute] = body[attribute]
		return update
