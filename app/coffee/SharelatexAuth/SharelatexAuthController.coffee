logger = require("logger-sharelatex")
AuthenticationController = require "../../../../../app/js/Features/Authentication/AuthenticationController"
UserGetter = require "../../../../../app/js/Features/User/UserGetter"
Settings = require "settings-sharelatex"
jwt = require('jsonwebtoken')

module.exports = SharelatexAuthController =
	authFromSharelatex: (req, res, next) ->
		{token} = req.query
		if !token?
			return SharelatexAuthController._badToken(res, new Error('no token provided'))
		jwt.verify token, Settings.accountMerge.secret, (error, data) ->
			return SharelatexAuthController._badToken(res, error) if error?
			if !data.login
				return SharelatexAuthController._badToken(
					res, new Error('expected token.login == true')
				)
			if !data.user_id?
				return SharelatexAuthController._badToken(
					res, new Error('expected token.user_id to be present')
				)
			user_id = data.user_id
			logger.log(
				{user_id},
				"logging in user from SL"
			)
			UserGetter.getUser user_id, (error, user) ->
				return next(error) if error?
				AuthenticationController.afterLoginSessionSetup req, user, (error) ->
					return next(error) if error?
					res.redirect "/"

	_badToken: (res, error) ->
		logger.err err: error, "bad token in confirming account"
		res.status(400).send("invalid token")
