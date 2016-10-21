RateLimiterMiddlewear = require("../../../../app/js/Features/Security/RateLimiterMiddlewear.js")
WikiController = require("./WikiController")
settings = require("settings-sharelatex")


module.exports =
	apply: (webRouter, apiRouter) ->

		if settings.apis.wiki?.url? or settings.proxyLearn
			#used for images onsite installs
			webRouter.get /^\/learn-scripts/, RateLimiterMiddlewear.rateLimit({
				endpointName: "wiki"
				params: []
				maxRequests: 60
				timeInterval: 60
			}), WikiController.proxy

			webRouter.get /^\/learn/, RateLimiterMiddlewear.rateLimit({
				endpointName: "wiki"
				params: []
				maxRequests: 60
				timeInterval: 60
			}), WikiController.getPage

