logger = require("logger-sharelatex")
AuthenticationController = require "../../../../../app/js/Features/Authentication/AuthenticationController"
passport = require "passport"
Url = require "url"
Path = require "path"

module.exports = OverleafAuthenticationController =
	setupUser: (req, res, next) ->
		# This will call OverleafAuthenticationManager.setupUser
		passport.authenticate("overleaf", (err, user, info) ->
			return next(err) if err?
			if info?.email_exists_in_sl
				return res.redirect Url.format({
					pathname: "/overleaf/email_exists",
					query: {email: info.email}
				})
			else
				return req.logIn(user, next)
		)(req, res, next)
	
	doLogin: (req, res, next) ->
		logger.log {user: req.user, info: req.info}, "successful log in from overleaf"
		AuthenticationController.afterLoginSessionSetup req, req.user, (err) ->
			return next(err) if err?
			redir = AuthenticationController._getRedirectFromSession(req) || "/project"
			res.redirect(redir)
	
	emailExists: (req, res, next) ->
		res.render Path.resolve(__dirname, "../views/email_exists"), { email: req.query.email }