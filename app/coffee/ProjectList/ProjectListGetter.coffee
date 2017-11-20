settings = require 'settings-sharelatex'
logger = require 'logger-sharelatex'
oAuthRequest = require '../OAuth/OAuthRequest'

module.exports = ProjectListGetter =
	findAllUsersProjects: (userId, callback = (error, projects) ->) ->
		oAuthRequest userId, {
			url: "#{settings.overleaf.host}/api/v1/sharelatex/docs"
			method: 'GET'
			json: true
			qs:
				per: 100 # Restrict number of projects to 100, working around potential perf problems
				exclude_imported: true
		}, (error, docs) ->
			if error?
				# Specially handle no connection err, so warning can be shown
				error = new Error('No V1 connection') if error.code == 'ECONNREFUSED'
				return callback(error)
			logger.log {userId, docs}, "got projects from V1"
			callback(null, docs)