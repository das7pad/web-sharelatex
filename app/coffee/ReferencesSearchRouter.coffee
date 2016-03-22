ReferencesSearchController = require './ReferencesSearchController'
RateLimiterMiddlewear = require('../../../../app/js/Features/Security/RateLimiterMiddlewear')
AuthorizationMiddlewear = require('../../../../app/js/Features/Authorization/AuthorizationMiddlewear')

module.exports = ReferencesSearchRouter =

	apply: (webRouter, apiRouter) ->
		webRouter.post(
			"/project/:Project_id/references/search",
			RateLimiterMiddlewear.rateLimit({
				endpointName: "search-references"
				params: ["Project_id"]
				maxRequests: 100
				timeInterval: 60
			}),
			AuthorizationMiddlewear.ensureUserCanReadProject,
			ReferencesSearchController.search
		)
