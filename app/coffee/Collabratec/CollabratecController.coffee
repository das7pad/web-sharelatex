AuthenticationController = require "../../../../../app/js/Features/Authentication/AuthenticationController"
FeaturesUpdater = require "../../../../../app/js/Features/Subscription/FeaturesUpdater"
CollabratecManager = require "./CollabratecManager"
OverleafAuthenticationManager = require "../Authentication/OverleafAuthenticationManager"
Path = require "path"
UserGetter = require "../../../../../app/js/Features/User/UserGetter"
V1LoginHandler = require "../V1Login/V1LoginHandler"
logger = require "logger-sharelatex"
settings = require "settings-sharelatex"

module.exports = CollabratecController =
	oauthLink: (req, res, next) ->
		logger.log req.query, "CollabratecController oauthLink"
		CollabratecManager.validateOauthParams req.query, (err, params) ->
			return CollabratecController._render_oauth_error req, res, err if err?
			req.session.collabratec_oauth_params = params
			res.redirect settings.collabratec.saml.init_path

	oauthLinkAfterSaml: (req, res, next) ->
		user = req.session.user
		saml_user = req.session.collabratec_saml_user
		logger.log { user, saml_user }, "CollabratecController oauthLinkAfterSaml"
		template_data =
			saml_user: saml_user
			title: "Link Overleaf to IEEE Collabratec™"
			user: user
		CollabratecManager.validateSamlData saml_user, (err) ->
			return CollabratecController._render_oauth_error req, res, err if err?
			if user?
				template_path =  Path.resolve __dirname, "../../views/oauth_link_after_saml_logged_in"
				res.render template_path, template_data
			else
				V1LoginHandler.getV1UserIdByEmail saml_user.Email, (err, v1_user_id) ->
					return next err if err?
					template_path = Path.resolve __dirname, "../../views/oauth_link_after_saml_logged_out"
					template_data.v1_user_exists = v1_user_id?
					res.render template_path, template_data

	oauthConfirmLink: (req, res, next) ->
		user = req.session.user
		saml_user = req.session.collabratec_saml_user
		logger.log { user, saml_user }, "CollabratecController oauthConfirmLink"
		CollabratecManager.validateSamlData req.session.collabratec_saml_user, (err) ->
			return CollabratecController._render_oauth_error req, res, err if err?
			CollabratecManager.validateOauthParams req.session.collabratec_oauth_params, (err) ->
				return CollabratecController._render_oauth_error req, res, err if err?
				if req.session.user?
					CollabratecController._oauthConfirmLinkExisting req, res, next
				else
					CollabratecController._oauthConfirmLinkRegister req, res, next

	_oauthConfirmLinkExisting: (req, res, next) ->
		oauth_params = req.session.collabratec_oauth_params
		saml_user = req.session.collabratec_saml_user
		UserGetter.getUser req.session.user._id, (err, user) ->
			return next err if err?
			return next new Error "missing overleaf.id" unless user?.overleaf?.id
			v1_user_id = user.overleaf.id
			CollabratecManager.setV1UserCollabratecId v1_user_id, saml_user.MemberNumber, (err, profile) ->
				if err
					if err.statusCode == 400
						template_path = Path.resolve __dirname, "../../views/oauth_account_already_linked"
						res.render template_path
					else
						next err
				else
					FeaturesUpdater.refreshFeatures user._id, false, (err) ->
						return next err if err?
						CollabratecController._setupUser req, res, next, profile

	_oauthConfirmLinkRegister: (req, res, next) ->
		oauth_params = req.session.collabratec_oauth_params
		saml_user = req.session.collabratec_saml_user
		register_options =
			collabratec_id: saml_user.MemberNumber
			email: saml_user.Email
			name: "#{saml_user.FirstName} #{saml_user.LastName}"
		V1LoginHandler.registerWithV1 register_options, (err, created, profile) ->
			return next err if err?
			if !created
				template_data =
					saml_user: saml_user
					title: "Link Overleaf to IEEE Collabratec™"
					user: req.session.user
					v1_user_exists: true
				template_path = Path.resolve __dirname, "../../views/oauth_link_after_saml_logged_out"
				res.render template_path, template_data
			else
				CollabratecController._setupUser req, res, next, profile

	oauthSignin: (req, res, next) ->
		CollabratecManager.validateSamlData req.session.collabratec_saml_user, (err) ->
			return CollabratecController._render_oauth_error req, res, err if err?
			res.redirect "/login"

	samlConsume: (req, res, next) ->
		oauth_params = req.session.collabratec_oauth_params
		saml_user = req.user
		# user gets set automatically by passport but we are not logged in yet
		delete req.session?.passport?.user
		logger.log { oauth_params, saml_user }, "CollabratecController samlConsume"
		if oauth_params
			req.session.collabratec_saml_user = saml_user
			res.redirect "/org/ieee/collabratec/auth/link_after_saml_response"
		else
			CollabratecManager.getV1UserByCollabratecId saml_user.MemberNumber, (err, profile) ->
				return _render_saml_error req, res, err if err?
				if profile?
					CollabratecController._setupUser req, res, next, profile
				else
					CollabratecManager.clearSession req.session
					res.redirect "/login?sso_error=collabratec_account_not_registered"

	_render_oauth_error: (req, res, err) ->
		logger.log { err }, "CollabratecController OAUTH Error"
		CollabratecManager.clearSession req.session
		template_data =
			ct_home_url: settings.collabratec.home_url
			title: "Error"
		template_path = Path.resolve __dirname, "../../views/oauth_error"
		res.render template_path, template_data

	_render_saml_error: (req, res, err) ->
		logger.log { err }, "CollabratecController SAML Error"
		CollabratecManager.clearSession req.session
		template_data =
			title: "Error"
		template_path = Path.resolve __dirname, "../../views/saml_error"
		res.render template_path, template_data

	_setupUser: (req, res, next, profile) ->
		OverleafAuthenticationManager.setupUser profile, (err, user, info) ->
			return next err if err?
			if info?.email_exists_in_sl
				OverleafAuthenticationController = require "../Authentication/OverleafAuthenticationController"
				url = OverleafAuthenticationController.prepareAccountMerge info, req
				res.redirect url
			else
				CollabratecController._finishLogin req
				AuthenticationController.finishLogin user, req, res, next

	_finishLogin: (req) ->
		oauth_params = req.session.collabratec_oauth_params
		if oauth_params
			redirect_url = CollabratecManager.oauthRedirectUrl oauth_params
			AuthenticationController._setRedirectInSession req, redirect_url
		CollabratecManager.clearSession req.session

	_completeOauthLink: (req, user, callback) ->
		oauth_params = req.session.collabratec_oauth_params
		return callback null, false unless oauth_params
		collabratec_user = req.session.collabratec_saml_user
		CollabratecManager.setV1UserCollabratecId user.overleaf.id, collabratec_user.MemberNumber, (err, profile) ->
			return callback err if err?
			CollabratecController._finishLogin req
			callback null, true
