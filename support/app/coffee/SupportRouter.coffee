SupportController = require("./SupportController")
logger = require("logger-sharelatex")

module.exports = 
	apply: (webRouter, apiRouter) ->
		webRouter.post "/support", SupportController.newSupportRequest
