Path = require 'path'
V1LoginHandler = require './V1LoginHandler'
logger = require 'logger-sharelatex'
AuthenticationController = require "../../../../../app/js/Features/Authentication/AuthenticationController"
OverleafAuthenticationManager = require "../Authentication/OverleafAuthenticationManager"
Url = require 'url'
jwt = require('jsonwebtoken')
Settings = require 'settings-sharelatex'


module.exports = V1Login =

	loginPage: (req, res, next) ->
		# if user is being sent to /login with explicit redirect (redir=/foo),
		# such as being sent from the editor to /login, then set the redirect explicitly
		if req.query.redir? and !AuthenticationController._getRedirectFromSession(req)?
			logger.log {redir: req.query.redir}, "setting explicit redirect from login page"
			AuthenticationController._setRedirectInSession(req, req.query.redir)
		res.render Path.resolve(__dirname, "../../views/v1_login"),
			title: 'Login with Overleaf v1',
			email: req.query.email

	doLogin: (req, res, next) ->
		email = req.body.email
		pass = req.body.password
		V1LoginHandler.authWithV1 email, pass, (err, isValid, profile) ->
			return next(err) if err?
			if !isValid
				logger.log {email},  "failed login via v1"
				AuthenticationController._recordFailedLogin()
				return res.json message: {type: 'error', text: req.i18n.translate('email_or_password_wrong_try_again')}
			else
				logger.log email: email, v1UserId: profile.id, "v1 credentials valid"
				OverleafAuthenticationManager.setupUser profile, (err, user, info) ->
					return callback(err) if err?
					if info?.email_exists_in_sl
						# Partially copied from OlAuthCon.setupUser
						logger.log {email, info}, "account exists in SL, redirecting to sharelatex to merge accounts"
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
						res.json {redir: url}
					else
						# All good, login and proceed
						logger.log {email}, "successful login with v1, proceeding with session setup"
						AuthenticationController._loginAsyncHandlers(req, email, user)
						redir = AuthenticationController._getRedirectFromSession(req) || "/project"
						AuthenticationController.afterLoginSessionSetup req, user, (err) ->
							if err?
								return next(err)
							AuthenticationController._clearRedirectFromSession(req)
							res.json {redir: redir}

