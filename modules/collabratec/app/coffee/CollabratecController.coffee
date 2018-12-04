CollabratecManager = require "./CollabratecManager"
logger = require "logger-sharelatex"

module.exports = CollabratecController =
	cloneProject: (req, res, next) ->
		return res.sendStatus(422) unless req.body.protect?
		return res.sendStatus(422) unless req.body.new_collabratec_document_id?
		return res.sendStatus(422) unless req.body.new_owner_collabratec_customer_id?
		CollabratecManager.getUserByCollabratecId req.body.new_owner_collabratec_customer_id, (err, user) ->
			return next err if err?
			return res.sendStatus(422) unless user?
			CollabratecManager.cloneProject user, req.params.project_id, req.body.protect, req.body.new_collabratec_document_id, req.body.new_owner_collabratec_customer_id, req.body.collabratec_privategroup_id, (err, result) ->
				return next err if err?
				res.status(201).json(result)

	createProject: (req, res, next) ->
		return res.sendStatus(422) unless req.body.template_id?
		return res.sendStatus(422) unless req.body.title?
		return res.sendStatus(422) unless req.body.collabratec_document_id?
		CollabratecManager.createProject req.oauth_user._id, req.body.template_id, req.body.title, req.body.doc_abstract, req.body.keywords, req.body.primary_author, req.body.collabratec_document_id, req.body.collabratec_privategroup_id, (err, result) ->
			return next err if err?
			res.status(201).json(result)

	deleteProject: (req, res, next) ->
		CollabratecManager.deleteProject req.params.project_id, (err) ->
			return next err if err?
			res.sendStatus(204)

	getProjects: (req, res, next) ->
		page = parseInt(req.query.page) || 1
		page_size = parseInt(req.query.page_size) || 30
		CollabratecManager.getProjects req.oauth_user, req.token, page, page_size, req.query.search, (err, response) ->
			return res.sendStatus(err.statusCode) if err? && 400 <= err.statusCode <= 403
			return next err if err?
			res.json response

	getProjectMetadata: (req, res, next) ->
		CollabratecManager.getProjectMetadata req.params.project_id, (err, response) ->
			return next err if err?
			res.json response

	linkProject: (req, res, next) ->
		return res.sendStatus(422) unless req.body.collabratec_document_id?
		CollabratecManager.linkProject req.params.project_id, req.oauth_user._id, req.body.collabratec_document_id, (err, result) ->
			return next err if err?
			res.status(201).json(result)

	unlinkProject: (req, res, next) ->
		CollabratecManager.unlinkProject req.params.project_id, req.oauth_user._id, (err) ->
			return next err if err?
			res.sendStatus(204)

	uploadProject: (req, res, next) ->
		return res.sendStatus(422) unless req.body.collabratec_document_id?
		return res.sendStatus(422) unless req.files?.zipfile?
		# return success now and callback with result after processing
		res.sendStatus(204)
		# process upload
		CollabratecManager.uploadProject req.oauth_user._id, req.files?.zipfile, req.body.collabratec_document_id, req.body.collabratec_privategroup_id, (err, project, project_metadata) ->
			logger.error { err: err, user_id: req.oauth_user._id }, "collabratec upload project error" if err?
			CollabratecManager.uploadProjectCallback req.oauth.user_profile.collabratec_customer_id, req.body.collabratec_document_id, project?._id, project_metadata, (err) ->
				logger.error { err: err, user_id: req.oauth_user._id }, "collabratec upload project callback error" if err?
