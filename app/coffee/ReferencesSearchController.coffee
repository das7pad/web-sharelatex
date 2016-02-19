logger = require('logger-sharelatex')
UserGetter = require('../../../../app/js/Features/User/UserGetter')
ReferencesSearchHandler = require('./ReferencesSearchHandler')

module.exports = ReferencesSearchController =

	_shouldDoSearch: (userId, callback=(err, should)->) ->
		UserGetter.getUser userId, (err, user) ->
			callback(err, user?.features?.references == true)

	search: (req, res) ->
		projectId = req.params.Project_id
		userId = req?.session?.user?._id
		query = req.body.query
		if !query
			logger.err {projectId, userId}, "error: no query supplied for references search"
			return res.sendStatus 400
		logger.log {projectId, userId}, "search for references"
		ReferencesSearchController._shouldDoSearch userId, (err, shouldDoSearch) ->
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
				# setTimeout(
				# 	() ->
				# 		res.json data
				# 	, 1000
				# )
				res.json data
