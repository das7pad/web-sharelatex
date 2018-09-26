Path = require 'path'
V1LoginHandler = require './V1LoginHandler'
logger = require 'logger-sharelatex'
AuthenticationController = require "../../../../../app/js/Features/Authentication/AuthenticationController"
UserRegistrationHandler = require "../../../../../app/js/Features/User/UserRegistrationHandler"
NewsLetterManager = require("../../../../../app/js/Features/Newsletter/NewsletterManager")
OverleafAuthenticationManager = require "../Authentication/OverleafAuthenticationManager"
OverleafAuthenticationController = require "../Authentication/OverleafAuthenticationController"
CollabratecController = require "../Collabratec/CollabratecController"
Url = require 'url'
jwt = require('jsonwebtoken')
Settings = require 'settings-sharelatex'
UserGetter = require('../../../../../app/js/Features/User/UserGetter')

module.exports = V1LoginController =

	registrationPage: (req, res, next) ->
		if AuthenticationController.isUserLoggedIn(req)
			return res.redirect('/project')
		sharedProjectData =
			project_name:req.query.project_name
			user_first_name:req.query.user_first_name

		newTemplateData = {}
		if req.session.templateData?
			newTemplateData.templateName = req.session.templateData.templateName

		res.render Path.resolve(__dirname, "../../views/register"),
			title: 'register'
			sharedProjectData: sharedProjectData
			newTemplateData: newTemplateData
			new_email:req.query.new_email || ""
			title: 'Register',
			email: req.query.new_email || ""
			ssoError: req.query.sso_error || null

	doRegistration: (req, res, next) ->
		requestIsValid = UserRegistrationHandler._registrationRequestIsValid(req.body)
		if !requestIsValid
			return next(new Error('registration request is not valid'))
		{email, password} = req.body
		logger.log {email}, "trying to create account via v1"
		subscribeToNewsletter = req.body.subscribeToNewsletter == 'true'
		V1LoginHandler.getUserByEmail email, (err, existingUser) ->
			return next(err) if err?
			if existingUser? and !existingUser?.overleaf?.id?
				logger.log {email}, "email conflicts with existing SL user, refusing to register"
				return res.json {
					message: {
						type: 'error',
						text: 'This email is in use by a Sharelatex account. Log in to ShareLaTeX to proceed'
					}
				}
			V1LoginHandler.registerWithV1 { email, password }, (err, created, profile) ->
				if err?
					logger.err {err, email}, "error while creating account in v1"
					return next(err)
				if !created
					logger.log {email}, "could not create account in v1"
					return res.json message: {type: 'error', text: req.i18n.translate('email_already_registered')}
				else
					logger.log email: email, v1UserId: profile.id, "v1 account created"
					OverleafAuthenticationManager.setupUser profile, (err, user, info) ->
						return callback(err) if err?
						if info?.email_exists_in_sl
							logger.log {email, info}, "account exists in SL, redirecting to sharelatex to merge accounts"
							url = OverleafAuthenticationController.prepareAccountMerge(info, req)
							res.json {redir: url}
						else
							# All good, login and proceed
							logger.log {email}, "successful registration with v1, proceeding with session setup"
							if subscribeToNewsletter
								NewsLetterManager.subscribe user, ->
							AuthenticationController.finishLogin(user, req, res, next)

	loginPage: (req, res, next) ->
		if AuthenticationController.isUserLoggedIn(req)
			return res.redirect('/project')
		# if user is being sent to /login with explicit redirect (redir=/foo),
		# such as being sent from the editor to /login, then set the redirect explicitly
		if req.query.redir? and !AuthenticationController._getRedirectFromSession(req)?
			logger.log {redir: req.query.redir}, "setting explicit redirect from login page"
			AuthenticationController._setRedirectInSession(req, req.query.redir)
		res.render Path.resolve(__dirname, "../../views/login"),
			title: 'Log in to Overleaf',
			email: req.query.email
			ssoError: req.query.sso_error || null

	doLogin: (req, res, next) ->
		email = req.body.email
		password = req.body.password

		V1LoginHandler.authWithV1 {email, password}, (err, isValid, profile) ->
			return next(err) if err?
			if !isValid
				logger.log {email},  "failed login via v1"
				AuthenticationController._recordFailedLogin()
				return res.json message: {type: 'error', text: req.i18n.translate('email_or_password_wrong_try_again')}
			else
				V1LoginController._login(profile, req, res, next)

	loginProfile: (req, res, next) ->
		profile = req.session.login_profile
		return next(new Error "missing profile") unless profile
		delete req.session.login_profile
		V1LoginController._setupUser profile, req, res, next

	_login: (profile, req, res, next) ->
		logger.log { email: profile.email, v1UserId: profile.id }, "v1 credentials valid"
		# check if there is any existing account matching either email
		# or overleaf id - if not redirect to check for existing account
		query = $or: [
			{ 'overleaf.id': profile.id },
			{ email: profile.email }
		]
		UserGetter.getUser query, { _id: 1 }, (err, user) ->
			return next(err) if err?
			# if v1 user is already associated with v2 account login
			if user
				V1LoginController._setupUser profile, req, res, next
			# otherwise redirect to check for existing account
			else
				req.session.login_profile = profile
				if req.headers?['accept']?.match(/^application\/json.*$/)
					res.json { redir: "/overleaf/auth_from_v1" }
				else
					res.redirect "/overleaf/auth_from_v1"

	_setupUser: (profile, req, res, next) ->
		OverleafAuthenticationManager.setupUser profile, (err, user, info) ->
			return next(err) if err?
			if info?.email_exists_in_sl
				logger.log { email: profile.email, info }, "account exists in SL, redirecting to sharelatex to merge accounts"
				redir = OverleafAuthenticationController.prepareAccountMerge(info, req)
				if req.headers?['accept']?.match(/^application\/json.*$/)
					res.json {redir}
				else
					res.redirect(redir)
			else
				# All good, login and proceed
				logger.log { email: profile.email }, "successful login with v1, proceeding with session setup"
				CollabratecController._completeOauthLink req, user, (err) ->
					return next err if err?
					AuthenticationController.finishLogin user, req, res, next
