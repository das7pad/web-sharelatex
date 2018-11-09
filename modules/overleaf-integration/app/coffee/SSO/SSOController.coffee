_ = require "lodash"
Path = require "path"
logger = require "logger-sharelatex"
V1LoginController = require "../V1Login/V1LoginController"
V1LoginHandler = require "../V1Login/V1LoginHandler"
EmailHelper = require "../../../../../app/js/Features/Helpers/EmailHelper"
ReferalAllocator = require "../../../../../app/js/Features/Referal/ReferalAllocator"

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
				V1LoginHandler.getV1UserIdByEmail req.user.email, (err, userId) -> 
					return SSOController._renderError(req, res, "email_registered_try_alternative", "login") if userId?
					SSOController._renderError(req, res, "not_registered")

	getRegisterSSOEmail: (req, res, next) ->
		res.render Path.resolve(__dirname, "../../views/sso_email"),
			title: "Add Email"

	postRegisterSSOEmail: (req, res, next) ->
		sso_user = _.cloneDeep(req.session.sso_user)
		return res.json { redir: "/register?sso_error=try_again" } unless sso_user?
		return SSOController._renderError req, res, "email_required" unless req.body.email?
		sso_user.email = EmailHelper.parseEmail(req.body.email)
		if !sso_user.email
			return next(new Error('sso email invalid'))
		SSOController._signUp(sso_user, req, res, next)

	_signUp: (sso_user, req, res, next) ->
		V1LoginHandler.registerWithV1 sso_user, (err, created, profile) ->
			if err?
				logger.log { sso_user, err }, "SSO ERROR"
				return SSOController._renderError(req, res, "registration_error")
			if created
				delete req.session.sso_user
				# We don't want to do anything with the result of this as the user has already signed up successfully.
				# ReferalAllocator.allocate will log if something goes wrong.
				ReferalAllocator.allocate req.session.referal_id, sso_user._id, req.session.referal_source, req.session.referal_medium, () ->
					V1LoginController._login(profile, req, res, next)
			else if profile?.email?
				return SSOController._renderError(req, res, "email_already_registered")
			else
				return SSOController._renderError(req, res, "registration_error")

	_renderError: (req, res, error, destination="register") ->
		# user gets set automatically by passport so delete on error
		delete req.session?.passport?.user
		if req.headers?['accept']?.match(/^application\/json.*$/)
			res.json message: {
				type: "error",
				text: req.i18n.translate(error),
			}
		else
			res.redirect "/#{destination}?sso_error=#{error}"
