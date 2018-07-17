Path = require 'path'
V1LoginHandler = require './V1LoginHandler'
logger = require 'logger-sharelatex'
AuthenticationController = require "../../../../../app/js/Features/Authentication/AuthenticationController"
UserRegistrationHandler = require "../../../../../app/js/Features/User/UserRegistrationHandler"
OverleafAuthenticationManager = require "../Authentication/OverleafAuthenticationManager"
OverleafAuthenticationController = require "../Authentication/OverleafAuthenticationController"
Url = require 'url'
jwt = require('jsonwebtoken')
Settings = require 'settings-sharelatex'


module.exports = V1Login =

	registrationPage: (req, res, next) ->
		sharedProjectData =
			project_name:req.query.project_name
			user_first_name:req.query.user_first_name

		newTemplateData = {}
		if req.session.templateData?
			newTemplateData.templateName = req.session.templateData.templateName

		res.render Path.resolve(__dirname, "../../views/v1_register"),
			title: 'register'
			sharedProjectData: sharedProjectData
			newTemplateData: newTemplateData
			new_email:req.query.new_email || ""
			title: 'Register',
			email: req.query.new_email || ""

	doRegistration: (req, res, next) ->
		requestIsValid = UserRegistrationHandler._registrationRequestIsValid(req.body)
		if !requestIsValid
			return next(new Error('registration request is not valid'))
		{email, password} = req.body
		logger.log {email}, "trying to create account via v1"
		V1LoginHandler.registerWithV1 email, password, (err, created, profile) ->
			if err?
				logger.err {err, email}, "error while creating account in v1"
				return next(err)
			if !created
				logger.log {email}, "could not create account in v1"
				return res.json message: {type: 'error', text: req.i18n.translate('email_already_registered')}
			else
				# pass to the rest of the workflow
				# NOTE: dupe of code below, refactor out
				logger.log email: email, v1UserId: profile.id, "v1 account created"
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
						AuthenticationController._clearRedirectFromSession(req)
						AuthenticationController.afterLoginSessionSetup req, user, (err) ->
							if err?
								return next(err)
							res.json {redir: redir}

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
						logger.log {email, info}, "account exists in SL, redirecting to sharelatex to merge accounts"
						url = OverleafAuthenticationController.prepareAccountMerge(info, req)
						res.json {redir: url}
					else
						# All good, login and proceed
						logger.log {email}, "successful login with v1, proceeding with session setup"
						AuthenticationController.finishLogin(user, req, res, next)

