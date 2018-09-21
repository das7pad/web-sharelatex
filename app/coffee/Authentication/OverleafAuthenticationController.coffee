logger = require("logger-sharelatex")
AuthenticationController = require "../../../../../app/js/Features/Authentication/AuthenticationController"
UserMapper = require "../OverleafUsers/UserMapper"
passport = require "passport"
Url = require "url"
Path = require "path"
Settings = require "settings-sharelatex"
jwt = require('jsonwebtoken')
FeaturesUpdater = require("../../../../../app/js/Features/Subscription/FeaturesUpdater")
OneTimeTokenHandler = require("../../../../../app/js/Features/Security/OneTimeTokenHandler")
EmailHandler = require("../../../../../app/js/Features/Email/EmailHandler")
Settings = require('settings-sharelatex')
UserGetter = require "../../../../../app/js/Features/User/UserGetter"
UserController = require("../../../../../app/js/Features/User/UserController")
CollabratecController = require "../Collabratec/CollabratecController"
logger = require 'logger-sharelatex'
V1LoginHandler = require '../V1Login/V1LoginHandler'


module.exports = OverleafAuthenticationController =

	sendSharelatexAccountMergeEmail: (req, res, next) ->
		sharelatexEmail = req.body.sharelatexEmail
		v1Id = req.session?.merge_account?.id
		final_email = req.session?.merge_account?.email
		if !v1Id? or !final_email?
			logger.log {}, "No v1Id/email in session, cannot send account-merge email to sharelatex address"
			return res.status(400).send()
		if !sharelatexEmail?
			logger.log {v1Id}, "No Sharelatex email supplied"
			return res.sendStatus(400)
		logger.log {v1Id, sharelatexEmail}, "Preparing to send account-merge link to sharelatex-email"
		UserGetter.getUserByMainEmail sharelatexEmail, {overleaf: 1}, (err, user) ->
			return next(err) if err?
			if user? and user?.overleaf?.id?
				logger.log {v1Id, sharelatexEmail},
					"email matches account already linked to v2, cannot send account-merge email"
				return res.status(400).json {errorCode: 'email_matches_v1_user_in_v2'}
			else if !user?
				logger.log {v1Id, sharelatexEmail},
					"email does not match unlinked account in sharelatex(mongo), cannot send account-merge email"
				return res.status(400).json {errorCode: 'email_not_in_sl'}
			V1LoginHandler.getV1UserIdByEmail sharelatexEmail, (err, otherV1Id) ->
				return next(err) if err?
				if otherV1Id? and otherV1Id != v1Id
					logger.log {v1Id, sharelatexEmail, otherV1Id},
						"email matches another account in v1, cannot send account-merge email"
					return res.status(400).json {errorCode: 'email_matches_v1_user'}
				mergeData = {
					v1_id: v1Id,
					sl_id: user._id,
					final_email: final_email,
					origin: 'ol'
				}
				OneTimeTokenHandler.getNewToken 'account-merge-email', mergeData, (err, token) ->
					return next(err) if err?
					EmailHandler.sendEmail 'accountMergeToSharelatexAddress', {
						origin: 'ol',
						to: sharelatexEmail,
						tokenLinkUrl: "#{Settings.accountMerge.betaHost}/account-merge/email/confirm?token=#{token}"
					}, () ->

					return res.sendStatus(201)

	saveRedir: (req, res, next) ->
		if req.query.redir?
			AuthenticationController._setRedirectInSession(req, req.query.redir)
		next()

	welcomeScreen: (req, res, next) ->
		res.render Path.resolve(__dirname, "../../views/welcome"), req.query

	showCheckAccountsPage: (req, res, next) ->
		if req.session.login_profile?
			{ email, id } = req.session.login_profile
			req.session.merge_account = { email, id }
			res.render Path.resolve(__dirname, "../../views/check_accounts"), {
				email: email
				login_profile: true
			}
		else
			{token} = req.query
			if !token?
				return res.redirect('/overleaf/login')

			jwt.verify token, Settings.accountMerge.secret, (err, data) ->
				if err?
					logger.err { err }, "bad token in checking accounts"
					return next(err)

				UserGetter.getUserByMainEmail data.email, {_id: 1}, (err, user) ->
					return next(err) if err?
					return res.redirect('/overleaf/login') if user
					req.session.merge_account = {
						id: data.id
						email: data.email
					}
					res.render Path.resolve(__dirname, "../../views/check_accounts"), {
						email: data.email
					}

	logout: (req, res, next) ->
		UserController._doLogout req, (err) ->
			return next(err) if err?
			# Redirect to v1 page which signs user out of v1 as well
			res.redirect Settings.overleaf.host + '/users/ensure_signed_out'

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
		req.session.accountMerge = {profile, user_id}
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
					res, new Error('expected token.merge_confirmed == true')
				)
			{profile, user_id} = req.session.accountMerge
			if data.user_id != user_id
				return OverleafAuthenticationController._badToken(
					res, new Error('expected token.user_id == session.accountMerge.user_id')
				)
			logger.log(
				{profile, user_id},
				"merging OL user with existing SL account"
			)
			UserMapper.mergeWithSlUser user_id, profile, (error, user) ->
				return next(error) if error?
				FeaturesUpdater.refreshFeatures(user_id) # Notifies v1 about SL-granted features too
				logger.log {user: user}, "merged with SL account, logging in"
				CollabratecController._completeOauthLink req, user, (err, linked) ->
					return callback err if err?
					if Settings.createV1AccountOnLogin and !linked
						AuthenticationController._setRedirectInSession(req, '/login/sharelatex/finish?had_v1_account')
					AuthenticationController.finishLogin(user, req, res, next)

	_badToken: (res, error) ->
		logger.err err: error, "bad token in confirming account"
		res.status(400).send("invalid token")
