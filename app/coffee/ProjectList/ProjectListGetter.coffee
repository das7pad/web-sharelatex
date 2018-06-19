settings = require 'settings-sharelatex'
logger = require 'logger-sharelatex'
oAuthRequest = require '../OAuth/OAuthRequest'
{ V1ConnectionError } = require "../../../../../app/js/Features/Errors/Errors"

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
				exclude_v2_projects: true
		}, (error, docs) ->
			if error?
				if error instanceof oAuthRequest.NoOverleafTokenError # Just a SL-only user
					return callback()
				else
					# Specially handle no connection err, so warning can be shown
					error = new V1ConnectionError('No V1 connection') if error.code == 'ECONNREFUSED'
					return callback(error)
			logger.log {userId, docs}, "got projects from V1"
			callback(null, {
				projects: docs.projects
				tags: docs.tags
				hasHiddenV1Projects: docs.project_pagination.total_items >= NO_PROJECTS_LIMIT
			})
