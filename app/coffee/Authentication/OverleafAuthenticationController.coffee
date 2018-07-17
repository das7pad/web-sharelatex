logger = require("logger-sharelatex")
AuthenticationController = require "../../../../../app/js/Features/Authentication/AuthenticationController"
UserMapper = require "../OverleafUsers/UserMapper"
passport = require "passport"
Url = require "url"
Path = require "path"
Settings = require "settings-sharelatex"
jwt = require('jsonwebtoken')
FeaturesUpdater = require("../../../../../app/js/Features/Subscription/FeaturesUpdater")

module.exports = OverleafAuthenticationController =
	welcomeScreen: (req, res, next) ->
		res.render Path.resolve(__dirname, "../../views/welcome"), req.query

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
				url = OverleafAuthenticationController.prepareAccountMerge(info, req)
				return res.render Path.resolve(__dirname, "../../views/confirm_merge"), {
					email: info.profile.email
					redirect_url: url
					suppressNavbar: true
				}
			else
				return AuthenticationController.finishLogin(user, req, res, next)
		)(req, res, next)

	prepareAccountMerge: (info, req) ->
		{profile, user_id} = info
		req.session.accountMerge = info
		token = jwt.sign(
			{ user_id, overleaf_email: profile.email, confirm_merge: true },
			Settings.accountMerge.secret,
			{ expiresIn: '1h' }
		)
		url = Settings.accountMerge.sharelatexHost + Url.format({
			pathname: "/user/confirm_account_merge",
			query: {token}
		})
		return url

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
				FeaturesUpdater.refreshFeatures(user_id) # Notifies v1 about SL-granted features too
				logger.log {user: user}, "merged with SL account, logging in"
				return AuthenticationController.finishLogin(user, req, res, next)

	_badToken: (res, error) ->
		logger.err err: error, "bad token in confirming account"
		res.status(400).send("invalid token")
