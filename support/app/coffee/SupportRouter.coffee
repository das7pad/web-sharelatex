SupportController = require("./SupportController")
logger = require("logger-sharelatex")

module.exports = 
	apply: (webRouter, apiRouter, publicApiRouter) ->
		webRouter.post "/support", SupportController.newSupportRequest
		webRouter.get "/support/user_details", SupportController.renderInfoPanelLoader
		publicApiRouter.post "/support/user_details", SupportController.getUserInfo