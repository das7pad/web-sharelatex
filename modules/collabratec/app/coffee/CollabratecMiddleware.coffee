AuthorizationManager = require "../../../../app/js/Features/Authorization/AuthorizationManager"
ProjectCollabratecDetailsHandler = require "../../../../app/js/Features/Project/ProjectCollabratecDetailsHandler"
V1Api = require "../../../../app/js/Features/V1/V1Api"
logger = require "logger-sharelatex"
mongojs = require "mongojs"

module.exports = CollabratecMiddlewear =
	ensureUserCanAdminProject: (req, res, next) ->
		AuthorizationManager.canUserAdminProject req.oauth_user._id, req.params.project_id, null, (err, canAdmin, becauseSiteAdmin) ->
			CollabratecMiddlewear._handleAuthResponse req, res, next, err, canAdmin && !becauseSiteAdmin, "admin", 403

	ensureUserCanDeleteProject: (req, res, next) ->
		AuthorizationManager.canUserAdminProject req.oauth_user._id, req.params.project_id, null, (err, canAdmin, becauseSiteAdmin) ->
			return next err if err?
			ProjectCollabratecDetailsHandler.isLinkedCollabratecUserProject req.params.project_id, req.oauth_user._id, (err, isLinked) ->
				return next err if err?
				CollabratecMiddlewear._handleAuthResponse req, res, next, err, canAdmin && !becauseSiteAdmin && isLinked, "delete", 422

	ensureUserCanReadProject: (req, res, next) ->
		AuthorizationManager.canUserReadProject req.oauth_user._id, req.params.project_id, null, (err, canRead, becauseSiteAdmin) ->
			CollabratecMiddlewear._handleAuthResponse req, res, next, err, canRead && !becauseSiteAdmin, "read", 403

	v1Proxy: (req, res, next) ->
		# use v2 if feature flag is set and this is either not a project
		# route or this is a project route and the project is v2
		return next() if req.oauth_user.useCollabratecV2 && (!req.params.project_id? || mongojs.ObjectId.isValid(req.params.project_id))
		# proxy to v1 for all users without feature flag and for v1 projects
		CollabratecMiddlewear._v1Proxy req, res, next

	_handleAuthResponse: (req, res, next, err, isAuthed, resource, errStatus) ->
		return next err if err?
		log_entry =
			user_id: req.oauth_user._id
			project_id: req.params.project_id
		if isAuthed
			logger.log log_entry, "allowing collabratec api user #{resource} access to project"
			next()
		else
			logger.log log_entry, "denying collabratec api user #{resource} access to project"
			res.sendStatus errStatus

	_v1Proxy: (req, res, next) ->
		options =
			json: req.body
			method: req.method
			uri: req.originalUrl
		V1Api.oauthRequest options, req.token, (err, response, body) ->
			return res.sendStatus err.statusCode if err? && 400 <= err.statusCode < 500
			return next err if err?
			res.status response.statusCode
			if typeof body == "object"
				res.json body
			else
				res.send body
