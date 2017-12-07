settings = require 'settings-sharelatex'
logger = require 'logger-sharelatex'
oAuthRequest = require '../OAuth/OAuthRequest'

# Restrict number of projects to 1000, working around potential perf problems
NO_PROJECTS_LIMIT = 1000

module.exports = ProjectListGetter =
	findAllUsersProjects: (userId, callback = (error, projects) ->) ->
		oAuthRequest userId, {
			url: "#{settings.overleaf.host}/api/v1/sharelatex/docs"
			method: 'GET'
			json: true
			qs:
				per: NO_PROJECTS_LIMIT
				exclude_imported: true
		}, (error, docs) ->
			if error?
				# Specially handle no connection err, so warning can be shown
				error = new Error('No V1 connection') if error.code == 'ECONNREFUSED'
				return callback(error)
			logger.log {userId, docs}, "got projects from V1"
			callback(null, {
				projects: docs.projects
				tags: docs.tags
				hasHiddenV1Projects: docs.project_pagination.total_items >= NO_PROJECTS_LIMIT
			})