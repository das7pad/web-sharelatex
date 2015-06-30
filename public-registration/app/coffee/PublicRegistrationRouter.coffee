PublicRegistrationController = require("./PublicRegistrationController")
logger = require("logger-sharelatex")

module.exports = 
	apply: (webRouter) ->
		removeRoute webRouter, "get", "/register"
		webRouter.get "/register", PublicRegistrationController.showRegisterPage
		webRouter.post "/register", PublicRegistrationController.register

removeRoute = (webRouter, method, path)->
	index = null
	for route, i in webRouter.stack
		if route?.route?.path == path
			index = i
	if index?
		logger.log method:method, path:path, index:index, "removing route from express router"
		webRouter.stack.splice(index,1)
