AuthorizationManager = require "../../../../app/js/Features/Authorization/AuthorizationManager"
ProjectCollabratecDetailsHandler = require "../../../../app/js/Features/Project/ProjectCollabratecDetailsHandler"
ProjectGetter = require "../../../../app/js/Features/Project/ProjectGetter"
V1Api = require "../../../../app/js/Features/V1/V1Api"
fs = require "fs"
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
		# always use v2 if not a project query
		return next() unless req.params.project_id?
		# always use v2 for v2 project ids
		return next() if mongojs.ObjectId.isValid(req.params.project_id)
		# check if v1 project id (readAndWrite token) has been imported to v2
		ProjectGetter.getProjectIdByReadAndWriteToken req.params.project_id, (err, v2_project_id) ->
			return next(err) if err?
			# if project has been imported then handle in v2
			if v2_project_id?
				req.params.project_id = v2_project_id
				next()
			# otherwise proxy to v1
			else
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
			method: req.method
			uri: req.originalUrl
		if req.file?
			options.formData =
				zipfile:
					options:
						filename: req.file.originalname
						contentType: req.file.mimetype
					value: fs.createReadStream req.file.path
			Object.assign(options.formData, req.body)
		else if req.body?
			options.json = req.body
		V1Api.oauthRequest options, req.token, (err, response, body) ->
			if req.file?
				# always delete upload but continue on errors
				fs.unlink req.file.path, (err) ->
					logger.error { err }, "error deleting collabratec zip upload"
			return res.sendStatus err.statusCode if err? && 400 <= err.statusCode < 500
			return next err if err?
			res.status response.statusCode
			if typeof body == "object"
				res.json body
			else
				res.send body
