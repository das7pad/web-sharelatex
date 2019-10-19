OpenInOverleafController = require("./OpenInOverleafController")
OpenInOverleafMiddleware = require("./OpenInOverleafMiddleware")
OpenInOverleafErrorController = require("./OpenInOverleafErrorController")
RateLimiterMiddleware = require("../../../../app/js/Features/Security/RateLimiterMiddleware")

module.exports =
	apply: (webRouter) ->
		webRouter.csrf.disableDefaultCsrfProtection('/docs', 'POST')
		webRouter.get  '/docs', OpenInOverleafMiddleware.middleware, OpenInOverleafController.openInOverleaf, OpenInOverleafErrorController.handleError
		webRouter.post '/docs', OpenInOverleafMiddleware.middleware,
			RateLimiterMiddleware.rateLimit({
				endpointName: "open-in-overleaf"
				maxRequests: 20
				timeInterval: 60
			}),
			OpenInOverleafController.openInOverleaf,
			OpenInOverleafErrorController.handleError

		webRouter.get '/devs', OpenInOverleafController.showDocumentation
