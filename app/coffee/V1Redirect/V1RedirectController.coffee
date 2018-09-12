logger = require 'logger-sharelatex'
AuthenticationController = require "../../../../../app/js/Features/Authentication/AuthenticationController"
UserGetter = require "../../../../../app/js/Features/User/UserGetter"
jwt = require 'jsonwebtoken'
settings = require 'settings-sharelatex'

module.exports = V1Redirect =

	sign_in_and_redirect: (req, res, next) ->
		userId = AuthenticationController.getLoggedInUserId req
		return next(new Error('user not found')) unless userId

		UserGetter.getUser userId, { overleaf: 1 }, (error, user) ->
			return next(new Error('user not on v1')) unless user?.overleaf?.id

			returnTo = req.query.return_to
			payload =
				user_id: user.overleaf.id,
				intent: 'sign_in_from_v2',
				unsafe_return_to: returnTo
			token = jwt.sign(
				payload,
				settings.accountMerge.secret,
				{ expiresIn: '1m' }
			)

			redirectUrl = settings.overleaf.host
			redirectUrl += '/users/sign_in_from_v2'
			redirectUrl += "?token=#{token}"

			logger.log { userId: user._id, returnTo }, 'sign in and redirect to v1'
			return res.redirect(redirectUrl)
