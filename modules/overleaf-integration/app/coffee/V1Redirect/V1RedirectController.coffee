logger = require 'logger-sharelatex'
AuthenticationController = require "../../../../../app/js/Features/Authentication/AuthenticationController"
UserGetter = require "../../../../../app/js/Features/User/UserGetter"
jwt = require 'jsonwebtoken'
settings = require 'settings-sharelatex'

_getRedirectUrlWithToken = (userId, returnTo) ->
	payload =
		user_id: userId, # This key/value pair is dropped if the userId is null
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

_getRedirectUrl = (userId, returnTo, callback = (error, redirectUrl)->) ->
	return callback(null, _getRedirectUrlWithToken(null, returnTo)) unless userId

	UserGetter.getUser userId, { overleaf: 1 }, (error, user) ->
		return callback(error) if error
		return callback(null, _getRedirectUrlWithToken(null, returnTo)) unless user?.overleaf?.id
		callback(null, _getRedirectUrlWithToken(user.overleaf.id, returnTo))

module.exports = V1Redirect =

	sign_in_and_redirect: (req, res, next) ->
		userId = AuthenticationController.getLoggedInUserId req
		returnTo = req.query.return_to

		_getRedirectUrl userId, returnTo, (error, redirectUrl) ->
			return next(error) if error

			code = if req.method == 'GET' then 302 else 307
			logger.log { userId, returnTo, code, redirectUrl }, 'redirect to v1'
			res.redirect(code, redirectUrl)
