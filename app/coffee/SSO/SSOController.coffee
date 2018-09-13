_ = require "lodash"
Path = require "path"
logger = require "logger-sharelatex"
V1LoginController = require "../V1Login/V1LoginController"
V1LoginHandler = require "../V1Login/V1LoginHandler"

module.exports = SSOController =
	authInit: (req, res, next) ->
		intent = req.query.intent
		return next(new Error "invalid intent") unless intent in ["sign_in", "sign_up"]
		req.session.sso_intent = intent
		next()

	authCallback: (req, res, next) ->
		intent = req.session.sso_intent
		delete req.session.sso_intent
		return next(new Error "invalid intent") unless intent in ["sign_in", "sign_up"]
		# if user is attempting sign_up we also sign_in so always attempt sign_in first
		V1LoginHandler.authWithV1 req.user, (err, isValid, profile) ->
			return next(err) if err?
			if isValid
				V1LoginController._login(profile, req, res, next)
			else if intent == "sign_up"
				if !req.user.email?
					req.session.sso_user = req.user
					return res.redirect "/register/sso_email"
				SSOController._signUp(req.user, req, res, next)
			else
				SSOController._errorRedirect(res, "not_registered")

	getRegisterSSOEmail: (req, res, next) ->
		res.render Path.resolve(__dirname, "../../views/sso_email"),
			title: "Add Email"

	postRegisterSSOEmail: (req, res, next) ->
		sso_user = _.cloneDeep(req.session.sso_user)
		return res.json { type: "error", text: "An error occurred. Please try again." } unless sso_user?
		return res.json { type: "error", text: "Email Required" } unless req.body.email?
		sso_user.email = req.body.email
		SSOController._signUpForm(sso_user, req, res, next)

	_signUp: (sso_user, req, res, next) ->
		V1LoginHandler.registerWithV1 sso_user, (err, created, profile) ->
			if err?
				logger.log { sso_user, err }, "SSO ERROR"
				return SSOController._errorRedirect(res, "register")
			if created
				delete req.session.sso_user
				V1LoginController._login(profile, req, res, next)
			else if profile.email?
				return SSOController._errorRedirect(res, "email_already_registered")
			else
				return SSOController._errorRedirect(res, "register")

	_signUpForm: (sso_user, req, res, next) ->
		V1LoginHandler.registerWithV1 sso_user, (err, created, profile) ->
			if err?
				logger.log { sso_user, err }, "SSO ERROR"
				return res.json message: { type: "error", text: "An error occurred" }
			if created
				delete req.session.sso_user
				V1LoginController._login(profile, req, res, next)
			else if profile.email?
				res.json message: { type: "error", text: req.i18n.translate("email_already_registered") }
			else
				res.json message: { type: "error", text: "An error occurred" }

	_errorRedirect: (res, error) ->
		res.redirect "/register/v1?error=#{error}"
