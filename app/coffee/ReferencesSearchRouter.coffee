ReferencesSearchController = require './ReferencesSearchController'
SecurityManager = require('../../../../app/js/managers/SecurityManager')
RateLimiterMiddlewear = require('../../../../app/js/Features/Security/RateLimiterMiddlewear')

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
			SecurityManager.requestCanAccessProject,
			ReferencesSearchController.search
		)
