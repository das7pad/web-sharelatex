AccountDeleteHandler = require('./AccountDeleteHandler')
UserDeleter = require '../../../../../app/js/Features/User/UserDeleter'
UserGetter = require '../../../../../app/js/Features/User/UserGetter'
UserSessionsManager = require '../../../../../app/js/Features/User/UserSessionsManager'
AuthenticationController = require '../../../../../app/js/Features/Authentication/AuthenticationController'
V1LoginHandler = require '../V1Login/V1LoginHandler'
logger = require 'logger-sharelatex'


module.exports = AccountDeleteController =

	tryDeleteUser: (req, res, next) ->
		# Copied and altered from UserController.tryDeleteUser,
		# this controller action overrides `/user/delete` in it's place
		user_id = AuthenticationController.getLoggedInUserId(req)
		password = req.body.password
		logger.log {user_id}, "[AccountDeleteController] trying to delete user account"
		if !password? or password == ''
			logger.err {user_id},
				'[AccountDeleteController] no password supplied for attempt to delete account'
			return res.sendStatus(403)
		UserGetter.getUser user_id, {email: 1, overleaf: 1}, (err, user) ->
			return next(err) if err?
			email = user.email
			if !user?.overleaf?.id?
				err = new Error('User does not have an overleaf id')
				logger.err {err, email, user_id}, "[AccountDeleteController] #{err.message}, can't delete account"
				return next(err)

			# Auth against v1 instead of mongo
			V1LoginHandler.authWithV1 email, password, (err, isValid, v1Profile) ->
				if err?
					logger.err {err, user_id, email},
						'[AccountDeleteController] error authenticating during attempt to delete account'
					return next(err)
				if !isValid
					logger.err {user_id, email},
						'[AccountDeleteController] auth failed during attempt to delete account'
					return res.sendStatus(403)

				if v1Profile.id != user.overleaf.id
					err = new Error('v1 id does not match overleaf id on this account')
					logger.err {err, v1Profile, overleafId: user?.overleaf?.id},
						"[AccountDeleteController] #{err.message}"
					return next(err)

				AccountDeleteHandler.deleteV1Account v1Profile.id, (err)->
					return next(err) if err?
					logger.log {user_id, email, v1Id: v1Profile.id},
						"[AccountDeleteController] deleted v1 account, now deleting mongo account"
					UserDeleter.deleteUser user_id, (err) ->
						if err?
							logger.err {user_id, email},
								"[AccountDeleteController] error while deleting user account"
							return next(err)
						sessionId = req.sessionID
						req.logout?()
						req.session.destroy (err) ->
							if err?
								logger.err err: err,
									'[AccountDeleteController] error destorying session'
								return next(err)
							UserSessionsManager.untrackSession(user, sessionId)
							res.sendStatus(200)

