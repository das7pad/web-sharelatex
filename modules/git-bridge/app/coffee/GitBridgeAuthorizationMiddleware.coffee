AuthorizationManager = require '../../../../app/js/Features/Authorization/AuthorizationManager'
logger = require 'logger-sharelatex'

module.exports =
	ensureUserCanReadProject: (req, res, next) ->
		project_id = req.params['project_id']
		user_id = req.oauth_user._id
		AuthorizationManager.canUserReadProject user_id, project_id, null, (error, canRead) ->
			return next(error) if error?
			if canRead
				logger.log {user_id, project_id}, "allowing user read access to git project"
				next()
			else
				res.sendStatus(401)

	ensureUserCanWriteProjectContent: (req, res, next) ->
		project_id = req.params['project_id']
		user_id = req.oauth_user._id
		AuthorizationManager.canUserWriteProjectContent user_id, project_id, null, (error, canRead) ->
			return next(error) if error?
			if canRead
				logger.log {user_id, project_id}, "allowing user write access to git project"
				next()
			else
				res.sendStatus(401)