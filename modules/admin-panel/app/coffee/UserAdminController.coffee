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
AuthenticationController = require("../../../../app/js/Features/Authentication/AuthenticationController")
SubscriptionLocator = require("../../../../app/js/Features/Subscription/SubscriptionLocator")
FeaturesUpdater = require("../../../../app/js/Features/Subscription/FeaturesUpdater")
async = require "async"
settings = require "settings-sharelatex"

EmailHelper = require "../../../../app/js/Features/Helpers/EmailHelper"

module.exports = UserAdminController =
	PER_PAGE: 100

	index: (req, res, next)->
		logger.log "getting admin request for list of users"
		UserAdminController._userFind null, 1, (err, users, pages)->
			return next(err) if err?
			res.render Path.resolve(__dirname, "../views/user/index"), users:users, pages:pages

	search: (req, res, next)->
		logger.log body: req.body, "getting admin request for search users"
		UserAdminController._userFind req.body, req.body.page, (err, users, pages) ->
			return next(err) if err?
			res.send 200, {users:users, pages:pages}

	_userFind: (params, page, cb = () ->) ->
		if params?.regexp
			query = new RegExp(params?.query)
		else
			query = EmailHelper.parseEmail params?.query

		if query? and params.secondaryEmailSearch
			q = { $or: [{ email: query }, { 'emails.email': query }] }
		else if query?
			q = { email: query }
		else
			q = {}

		skip = (page - 1) * UserAdminController.PER_PAGE
		opts = {limit: UserAdminController.PER_PAGE, skip : skip, sort: {email: 1} }
		logger.log opts:opts, q:q, "user options and query"
		User.find q, {first_name:1, email:1, lastLoggedIn:1, loginCount:1}, opts, (err, users)->
			if err?
				logger.err err:err, "error getting admin data for users list page"
				return cb(err)
			logger.log opts:opts, q:q, users_length:users?.length, "found users for admin search"
			User.count q, (err, count) ->
				return cb(err) if err?
				pages = Math.ceil(count / UserAdminController.PER_PAGE)
				cb(err, users, pages)

	show: (req, res, next)->
		user_id = req.params.user_id
		logger.log {user_id}, "getting admin request for user info"
		async.parallel {
			user: (cb) ->
				UserGetter.getUser user_id, {
					_id:1, first_name:1, last_name:1, email:1, betaProgram:1, features: 1, isAdmin: 1, awareOfV2: 1, overleaf: 1, emails: 1, signUpDate:1, loginCount:1, lastLoggedIn:1, lastLoginIp:1, useCollabratecV2: 1, refered_user_count: 1
				}, cb
			projects: (cb) ->
				ProjectGetter.findAllUsersProjects user_id, {
					name:1, lastUpdated:1, publicAccesLevel:1, archived:1, owner_ref:1
				}, (err, projects) ->
					{owned, readAndWrite, readOnly} = projects
					return cb(err) if err?
					allProjects = owned.concat(readAndWrite).concat(readOnly)
					allProjects = _.map allProjects, (project)->
						projectTimestamp = project._id.toString().substring(0,8)
						project.createdAt = new Date( parseInt( projectTimestamp, 16 ) * 1000 )
						return project
					return cb(null, allProjects)

			adminSubscription: (cb) ->
				SubscriptionLocator.getUsersSubscription user_id, cb
			managedSubscription: (cb) ->
				SubscriptionLocator.findManagedSubscription user_id, cb
			memberSubscriptions: (cb) ->
				SubscriptionLocator.getMemberSubscriptions user_id, cb
		}, (err, data) ->
			return next(err) if err?
			data.isSuperAdmin = UserAdminController._isSuperAdmin(req)
			res.render Path.resolve(__dirname, "../views/user/show"), data

	delete: (req, res, next)->
		user_id = req.params.user_id
		logger.log user_id: user_id, "received admin request to delete user"
		UserDeleter.deleteUser user_id, (err)->
			return next(err) if err?
			res.sendStatus 200

	deleteOverleafV1Link: (req, res, next)->
		user_id = req.params.user_id
		logger.log user_id: user_id, "received admin request to unlink account from v1 Overleaf"
		update =
			$unset:{overleaf: ""}
		UserUpdater.updateUser user_id, update, (err)->
			return next(err) if err?
			res.sendStatus 200


	deleteSecondaryEmail: (req, res, next)->
		user_id = req.params.user_id
		emailToRemove = req.body.emailToRemove
		logger.log user_id:user_id, emailToRemove:emailToRemove,  "received request to delete secondary email"
		UserUpdater.removeEmailAddress user_id, emailToRemove, (err)->
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
		'features.gitBridge',
		'features.compileTimeout',
		'features.compileGroup',
		'features.templates',
		'features.trackChanges',
		'features.references',
		'features.referencesSearch',
		'features.mendeley',
		'features.zotero',
		'awareOfV2',
		'useCollabratecV2',
		'refered_user_count'
	]
	SUPER_ADMIN_ALLOWED_ATTRIBUTES: [
		'isAdmin'
	]
	BOOLEAN_ATTRIBUTES: [
		'betaProgram',
		'features.versioning',
		'features.dropbox',
		'features.github',
		'features.gitBridge',
		'features.templates',
		'features.trackChanges',
		'features.references',
		'features.referencesSearch',
		'features.mendeley',
		'features.zotero',
		'awareOfV2',
		'isAdmin',
		'useCollabratecV2'
	]
	update: (req, res, next) ->
		user_id = req.params.user_id
		allowed_attributes = UserAdminController.ALLOWED_ATTRIBUTES
		if UserAdminController._isSuperAdmin(req)
			allowed_attributes = allowed_attributes.concat(UserAdminController.SUPER_ADMIN_ALLOWED_ATTRIBUTES)
		update = UserAdminController._reqToMongoUpdate(
			req.body,
			allowed_attributes,
			UserAdminController.BOOLEAN_ATTRIBUTES
		)
		logger.log {user_id, update}, "updating user via admin panel"
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

	refreshFeatures: (req, res, next) ->
		user_id = req.params.user_id
		FeaturesUpdater.refreshFeatures user_id, true, (err) ->
			return next(err) if err?
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

	_isSuperAdmin: (req) ->
		current_user_id = AuthenticationController.getLoggedInUserId(req)
		if settings.superAdminUserIds? and current_user_id in settings.superAdminUserIds
			return true
		else
			return false

