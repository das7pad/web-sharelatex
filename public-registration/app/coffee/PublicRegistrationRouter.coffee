PublicRegistrationController = require("./PublicRegistrationController")
CaptchaMiddleware = require '../../../../app/js/Features/Captcha/CaptchaMiddleware'
Settings = require 'settings-sharelatex'

logger = require("logger-sharelatex")

module.exports = 
	apply: (webRouter) ->
		# This registration module has been superceeded by the work in
		# Overleaf integration, but we're not yet ready to rip this out,
		# because this is entangled with the acceptance tests.
		#
		# This option will be on for test runs
		if Settings.enableLegacyRegistration
			removeRoute webRouter, "get", "/register"
			webRouter.get "/register", PublicRegistrationController.showRegisterPage
			webRouter.post "/register", CaptchaMiddleware.validateCaptcha, PublicRegistrationController.register

removeRoute = (webRouter, method, path)->
	index = null
	for route, i in webRouter.stack
		if route?.route?.path == path
			index = i
	if index?
		logger.log method:method, path:path, index:index, "removing route from express router"
		webRouter.stack.splice(index,1)
