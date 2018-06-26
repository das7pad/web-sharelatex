settings = require 'settings-sharelatex'
logger = require 'logger-sharelatex'
request = require 'request'
UserGetter = require "../../../../../app/js/Features/User/UserGetter"
{ V1ConnectionError } = require "../../../../../app/js/Features/Errors/Errors"

# Restrict number of projects to 1000, working around potential perf problems
NO_PROJECTS_LIMIT = 1000

module.exports = ProjectListGetter =
	findAllUsersProjects: (v2_user_id, callback = (error, projects) ->) ->
		UserGetter.getUser v2_user_id, (error, user) ->
			return callback(error) if error?

			v1_user_id = user?.overleaf?.id
			if !v1_user_id
				logger.err {error}, "failed to import because user is not a V1 user"
				return callback(new Error("failed to import because user is not a V1 user"))

			request.get {
				url: "#{settings.overleaf.host}/api/v1/sharelatex/users/#{v1_user_id}/docs"
				json: true
				qs:
					per: NO_PROJECTS_LIMIT
					exclude_v2_projects: true
			}, (error, docs) ->
				if error?
					error = new V1ConnectionError('No V1 connection') if error.code == 'ECONNREFUSED'
					return callback(error)
				logger.log {v2_user_id, v1_user_id, docs}, "got projects from V1"
				callback(null, {
					projects: docs.projects
					tags: docs.tags
					hasHiddenV1Projects: docs.project_pagination.total_items >= NO_PROJECTS_LIMIT
				})
