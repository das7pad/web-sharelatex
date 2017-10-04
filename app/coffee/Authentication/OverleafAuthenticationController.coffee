logger = require("logger-sharelatex")
AuthenticationController = require "../../../../../app/js/Features/Authentication/AuthenticationController"
UserMapper = require "../OverleafUsers/UserMapper"
passport = require "passport"
Url = require "url"
Path = require "path"
Settings = require "settings-sharelatex"
jwt = require('jsonwebtoken')

module.exports = OverleafAuthenticationController =
	setupUser: (req, res, next) ->
		# This will call OverleafAuthenticationManager.setupUser
		passport.authenticate("overleaf", (err, user, info) ->
			if err?
				if err.name == "TokenError"
					return res.redirect "/overleaf/login" # Token expired, try again
				else
					return next(err) 
			if info?.email_exists_in_sl
				logger.log {info}, "redirecting to sharelatex to merge accounts"
				{profile, accessToken, refreshToken, user_id} = info
				req.session.accountMerge = {profile, accessToken, refreshToken, user_id}
				token = jwt.sign(
					{ user_id, overleaf_email: profile.email, confirm_merge: true },
					Settings.accountMerge.secret,
					{ expiresIn: '1h' }
				)
				url = Settings.accountMerge.sharelatexHost + Url.format({
					pathname: "/user/confirm_account_merge",
					query: {token}
				})
				return res.render Path.resolve(__dirname, "../../views/confirm_merge"), {
					email: profile.email
					redirect_url: url
					suppressNavbar: true
				}
			else
				return req.logIn(user, next)
		)(req, res, next)

	doLogin: (req, res, next) ->
		logger.log {user: req.user, info: req.info}, "successful log in from overleaf"
		AuthenticationController.afterLoginSessionSetup req, req.user, (err) ->
			return next(err) if err?
			redir = AuthenticationController._getRedirectFromSession(req) || "/project"
			res.redirect(redir)

	confirmedAccountMerge: (req, res, next) ->
		{token} = req.query
		if !token?
			return OverleafAuthenticationController._badToken(res, new Error('no token provided'))
		jwt.verify token, Settings.accountMerge.secret, (error, data) ->
			return OverleafAuthenticationController._badToken(res, error) if error?
			if !data.merge_confirmed
				return OverleafAuthenticationController._badToken(
					res, new Error('expected token.confirm_merge == true')
				)
			{profile, accessToken, refreshToken, user_id} = req.session.accountMerge
			if data.user_id != user_id
				return OverleafAuthenticationController._badToken(
					res, new Error('expected token.user_id == session.accountMerge.user_id')
				)
			logger.log(
				{profile, accessToken, refreshToken, user_id},
				"merging OL user with existing SL account"
			)
			UserMapper.mergeWithSlUser user_id, profile, accessToken, refreshToken,	(error, user) ->
				return next(error) if error?
				logger.log {user: user}, "merged with SL account, logging in"
				return req.logIn(user, next)

	_badToken: (res, error) ->
		logger.err err: error, "bad token in confirming account"
		res.status(400).send("invalid token")
