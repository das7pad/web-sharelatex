ReferencesSearchController = require './ReferencesSearchController'
SecurityManager = require('../../../../app/js/managers/SecurityManager')

module.exports = ReferencesSearchRouter =

	apply: (webRouter, apiRouter) ->
		webRouter.post(
			"/project/:Project_id/references/search",
			SecurityManager.requestCanAccessProject,
			ReferencesSearchController.search
		)
