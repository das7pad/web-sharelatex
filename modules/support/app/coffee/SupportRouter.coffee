SupportController = require("./SupportController")
RateLimiterMiddlewear = require('../../../../app/js/Features/Security/RateLimiterMiddlewear')

logger = require("logger-sharelatex")

module.exports = 
	apply: (webRouter, apiRouter, publicApiRouter) ->
		webRouter.post "/support", SupportController.newSupportRequest
		webRouter.get "/support/user_details", SupportController.renderInfoPanelLoader
		publicApiRouter.post "/support/user_details", 
			RateLimiterMiddlewear.rateLimit({
				endpointName: "get-user-details-front"
				maxRequests: 20
				timeInterval: 60
			}),SupportController.getUserInfo