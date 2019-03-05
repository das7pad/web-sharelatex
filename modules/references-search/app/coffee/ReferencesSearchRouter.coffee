ReferencesSearchController = require './ReferencesSearchController'
RateLimiterMiddleware = require('../../../../app/js/Features/Security/RateLimiterMiddleware')
AuthorizationMiddleware = require('../../../../app/js/Features/Authorization/AuthorizationMiddleware')

module.exports = ReferencesSearchRouter =

	apply: (webRouter, apiRouter) ->
		webRouter.post(
			"/project/:Project_id/references/search",
			RateLimiterMiddleware.rateLimit({
				endpointName: "search-references"
				params: ["Project_id"]
				maxRequests: 100
				timeInterval: 60
			}),
			AuthorizationMiddleware.ensureUserCanReadProject,
			ReferencesSearchController.search
		)
