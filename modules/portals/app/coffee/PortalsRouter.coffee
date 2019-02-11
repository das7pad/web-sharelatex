logger = require 'logger-sharelatex'
PortalsController = require './PortalsController'

module.exports =
	apply: (webRouter) ->
		webRouter.get '/edu/:slug', PortalsController.getPortalEdu
		webRouter.get '/org/:slug', PortalsController.getPortalOrg
		webRouter.get '/org/:publisher/journal/:journal', PortalsController.friendlyTemplateLink
