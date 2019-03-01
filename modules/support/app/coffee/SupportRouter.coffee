SupportController = require("./SupportController")
RateLimiterMiddleware = require('../../../../app/js/Features/Security/RateLimiterMiddleware')

logger = require("logger-sharelatex")

module.exports = 
	apply: (webRouter, apiRouter, publicApiRouter) ->
		webRouter.post "/support",
			RateLimiterMiddleware.rateLimit({
				endpointName: "support-front"
				maxRequests: 20
				timeInterval: 60
			}),SupportController.newSupportRequest
		webRouter.get "/support/user_details", SupportController.renderInfoPanelLoader
		publicApiRouter.post "/support/user_details", 
			RateLimiterMiddleware.rateLimit({
				endpointName: "get-user-details-front"
				maxRequests: 20
				timeInterval: 60
			}),SupportController.getUserInfo
