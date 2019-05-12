Path = require 'path'
V1LoginHandler = require './V1LoginHandler'
logger = require 'logger-sharelatex'
WEB = "../../../../.."
AuthenticationController = require "#{WEB}/app/js/Features/Authentication/AuthenticationController"
AuthenticationManager = require "#{WEB}/app/js/Features/Authentication/AuthenticationManager"
UserGetter = require "#{WEB}/app/js/Features/User/UserGetter"
UserRegistrationHandler = require "#{WEB}/app/js/Features/User/UserRegistrationHandler"
ReferalAllocator = require("#{WEB}/app/js/Features/Referal/ReferalAllocator")
NewsLetterManager = require("#{WEB}/app/js/Features/Newsletter/NewsletterManager")
OverleafAuthenticationManager = require "../Authentication/OverleafAuthenticationManager"
OverleafAuthenticationController = require "../Authentication/OverleafAuthenticationController"
CollabratecController = require "../Collabratec/CollabratecController"
EmailHelper = require "#{WEB}/app/js/Features/Helpers/EmailHelper"
Errors = require "#{WEB}/app/js/Features/Errors/Errors"
Url = require 'url'
jwt = require('jsonwebtoken')
Settings = require 'settings-sharelatex'

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
			return next(new Errors.InvalidError('registration request is not valid'))
		{email, password} = req.body
		email = EmailHelper.parseEmail(email)
		if !email
			logger.err {email}, "registration email invalid"
			return res.json message: {type: 'error', text: req.i18n.translate('invalid_email')}
		validationError = AuthenticationManager.validatePassword(password)
		if validationError?
			logger.err {email}, "registration password invalid"
			return res.json message: {type: 'error', text: validationError.message}
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
						return next(err) if err?

						if info?.email_exists_in_sl
							logger.log {email, info}, "account exists in SL, redirecting to sharelatex to merge accounts"
							url = OverleafAuthenticationController.prepareAccountMerge(info, req)
							res.json {redir: url}
						else
							# All good, login and proceed
							logger.log {email}, "successful registration with v1, proceeding with session setup"
							if subscribeToNewsletter
								NewsLetterManager.subscribe user, ->

							# We don't want to do anything with the result of this as the user has already signed up successfully.
							# ReferalAllocator.allocate will log if something goes wrong.
							ReferalAllocator.allocate req.session.referal_id, user._id, req.session.referal_source, req.session.referal_medium, () ->
								AuthenticationController.finishLogin(user, req, res, next)

	loginPage: (req, res, next) ->
		if AuthenticationController.isUserLoggedIn(req)
			return res.redirect('/project')
		# if user is being sent to /login with explicit redirect (redir=/foo),
		# such as being sent from the editor to /login, then set the redirect explicitly
		if req.query.redir? and !AuthenticationController._getRedirectFromSession(req)?
			logger.log {redir: req.query.redir}, "setting explicit redirect from login page"
			AuthenticationController.setRedirectInSession(req, req.query.redir)
		res.render Path.resolve(__dirname, "../../views/login"),
			title: 'Log in to Overleaf',
			email: req.query.email
			ssoError: req.query.sso_error || null

	doLogin: (req, res, next) ->
		email = EmailHelper.parseEmail(req.body.email)
		if !email
			return res.json message: {type: 'error', text: req.i18n.translate('invalid_email')}
		password = req.body.password

		V1LoginHandler.authWithV1 {email, password}, (err, isValid, profile) ->
			return next(err) if err?
			if !isValid
				logger.log {email},  "failed login via v1"
				AuthenticationController._recordFailedLogin()
				return res.json message: {type: 'error', text: req.i18n.translate('email_or_password_wrong_try_again') + ', or <a href="/user/password/reset">set or reset your password</a>'}
			else
				V1LoginController._login(profile, req, res, next)

	doPasswordChange: (req, res, next) ->
		unless req.body.newPassword1 == req.body.newPassword2
			return res.json message: {
				type: 'error',
				text: req.i18n.translate('password_change_passwords_do_not_match')
			}
		validationError = AuthenticationManager.validatePassword(req.body.newPassword1)
		if validationError?
			return res.json message: {
				type: 'error',
				text: validationError.message
			}
		lightUser = AuthenticationController.getSessionUser(req)
		UserGetter.getUser lightUser._id, (err, user) ->
			return next(err) if err?
			v1Id = user?.overleaf?.id
			email = user?.email
			current_password = req.body.currentPassword
			password = req.body.newPassword1

			if (v1Id? && email? && password?)
				V1LoginHandler.doPasswordChange {
						email, v1Id, password, current_password,
					}, (err, isValid) =>
						return next(err) if err?
						if !isValid
							logger.log {v1Id, email},  "failed password change via v1"
							return res.json message: {
								type: 'error',
								text: req.i18n.translate('password_change_failed_attempt')
							}
						else
							logger.log {v1Id, email}, "v1 password updated"
							return res.json message: {
								type: 'success',
								email,
								text: req.i18n.translate('password_change_successful')
							}
			else
				return res.json message: {type: 'error', text: req.i18n.translate('internal_error')}

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
