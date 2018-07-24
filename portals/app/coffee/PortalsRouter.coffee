logger = require 'logger-sharelatex'
PortalsController = require './PortalsController'

module.exports =
	apply: (webRouter) ->
		# to do: index routes
		# webRouter.get '/edu', PortalsController.getIndexEdu
		# webRouter.get '/org', PortalsController.getIndexOrg
		webRouter.get '/edu/:slug', PortalsController.getPortalEdu
		webRouter.get '/org/:slug', PortalsController.getPortalOrg