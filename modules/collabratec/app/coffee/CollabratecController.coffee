CollabratecManager = require "./CollabratecManager"

module.exports = CollabratecController =
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
