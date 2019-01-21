OpenInOverleafController = require("./OpenInOverleafController")
OpenInOverleafMiddleware = require("./OpenInOverleafMiddleware")
OpenInOverleafErrorController = require("./OpenInOverleafErrorController")
RateLimiterMiddlewear = require("../../../../app/js/Features/Security/RateLimiterMiddlewear")

module.exports =
	apply: (webRouter) ->
		webRouter.csrf.disableDefaultCsrfProtection('/docs', 'POST')
		webRouter.get  '/docs', OpenInOverleafMiddleware.middleware, OpenInOverleafController.openInOverleaf, OpenInOverleafErrorController.handleError
		webRouter.post '/docs', OpenInOverleafMiddleware.middleware,
			RateLimiterMiddlewear.rateLimit({
				endpointName: "open-in-overleaf"
				maxRequests: 20
				timeInterval: 60
			}),
			OpenInOverleafController.openInOverleaf,
			OpenInOverleafErrorController.handleError

		webRouter.get '/devs', OpenInOverleafController.showDocumentation
