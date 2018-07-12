Path = require 'path'
V1LoginHandler = require './V1LoginHandler'
logger = require 'logger-sharelatex'
AuthenticationController = require "../../../../../app/js/Features/Authentication/AuthenticationController"


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
				logger.log email: email,  "failed login via v1"
				AuthenticationController._recordFailedLogin()
				return res.json message: {type: 'error', text: req.i18n.translate('email_or_password_wrong_try_again')}
			else
				logger.log email: email, v1UserId: profile.id, "successful login via v1"
				V1LoginHandler.handleAuthSuccess email, profile, (err, loginUser) ->
					return next(err) if err?
					if !loginUser
						logger.err email: email, v1UserId: profile.id, "Cannot proceed with v1 login"
						AuthenticationController._recordFailedLogin()
						return res.json message: {type: 'error', text: req.i18n.translate('login_failed')}
					AuthenticationController._loginAsyncHandlers(req, email, loginUser)
					redir = AuthenticationController._getRedirectFromSession(req) || "/project"
					AuthenticationController.afterLoginSessionSetup req, loginUser, (err) ->
						if err?
							return next(err)
						AuthenticationController._clearRedirectFromSession(req)
						res.json {redir: redir}

