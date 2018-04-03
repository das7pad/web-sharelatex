logger = require('logger-sharelatex')
ProjectGetter = require "../../../../app/js/Features/Project/ProjectGetter"
UserGetter = require('../../../../app/js/Features/User/UserGetter')
AuthenticationController = require('../../../../app/js/Features/Authentication/AuthenticationController')
ReferencesSearchHandler = require('./ReferencesSearchHandler')

module.exports = ReferencesSearchController =

	_shouldDoSearch: (projectId, callback=(err, should)->) ->
		ProjectGetter.getProject projectId, {owner_ref: 1}, (err, project) ->
			if err
				logger.err {err, projectId}, "error fetching project"
				return callback(err)
			UserGetter.getUser project.owner_ref, (err, owner) ->
				callback(err, owner?.features?.referencesSearch or owner?.features?.references)

	search: (req, res) ->
		projectId = req.params.Project_id
		userId = AuthenticationController.getLoggedInUserId(req)
		query = req.body.query
		if !query
			logger.err {projectId, userId}, "error: no query supplied for references search"
			return res.sendStatus 400
		logger.log {projectId, userId, query}, "search for references"
		ReferencesSearchController._shouldDoSearch projectId, (err, shouldDoSearch) ->
			if err
				logger.err {err, projectId, userId}, "error checking if search should proceed"
				return res.sendStatus 500
			if !shouldDoSearch
				logger.log {projectId, userId}, "user is not permitted to search references"
				return res.sendStatus 500
			ReferencesSearchHandler.search projectId, query, (err, data) ->
				if err
					logger.err {err, projectId, userId}, "error searching for references"
					return res.sendStatus 500
				res.json data
