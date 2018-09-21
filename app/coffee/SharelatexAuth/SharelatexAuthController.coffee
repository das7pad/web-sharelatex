logger = require("logger-sharelatex")
AuthenticationController = require "../../../../../app/js/Features/Authentication/AuthenticationController"
UserGetter = require "../../../../../app/js/Features/User/UserGetter"
UserUpdater = require "../../../../../app/js/Features/User/UserUpdater"
LimitationsManager = require "../../../../../app/js/Features/Subscription/LimitationsManager"
Settings = require "settings-sharelatex"
jwt = require('jsonwebtoken')
Path = require('path')
SharelatexAuthHandler = require "./SharelatexAuthHandler"

module.exports = SharelatexAuthController =

	finishPage: (req, res, next) ->
		user = AuthenticationController.getSessionUser(req)
		LimitationsManager.userHasSubscriptionOrIsGroupMember user, (err, hasSubscription) ->
			return next(err) if err?

			return res.render Path.resolve(__dirname, "../../views/logged_in_with_sl"),
				had_v1_account: req.query?.had_v1_account?
				hasSubscription: hasSubscription

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
				SharelatexAuthController._createBackingAccountIfNeeded user, req, (err) ->
					return next(err) if err?
					AuthenticationController.finishLogin(user, req, res, next)

	_createBackingAccountIfNeeded: (user, req, callback=(err)->) ->
		if !Settings.createV1AccountOnLogin
			return callback(null)
		user_id = user._id
		email = user.email
		logger.log {user_id, email}, "Creating backing account in v1 for user"
		SharelatexAuthHandler.createBackingAccount user, (err, profile) ->
			if err?
				logger.err {err, user_id, email}, "error while creating backing account in v1"
				return callback(err)
			else
				logger.log {email, v1UserId: profile.id}, "v1 backing account created, adding overleaf-id to account"
				UserUpdater.updateUser user_id, {
					$set: {
						'overleaf.id': profile.id,
						'ace.overallTheme': 'light-'
					}
				}, (err) ->
					return callback(err) if err?
					# All good, login and proceed
					logger.log {email}, "successful registration with v1, proceeding with session setup"
					AuthenticationController._setRedirectInSession(req, '/login/sharelatex/finish')
					callback(null)

	_badToken: (res, error) ->
		logger.err { err: error, expiredAt: error.expiredAt, now: new Date().toISOString() },
			"bad token in logging in from sharelatex"
		res.status(400).send("invalid token")
