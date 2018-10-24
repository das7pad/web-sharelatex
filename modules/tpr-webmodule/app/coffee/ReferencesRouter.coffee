AuthenticationController = require "../../../../app/js/Features/Authentication/AuthenticationController"
ReferencesApiHandler = require("./ReferencesApiHandler")

module.exports =
	apply: (app) ->
		app.get  '/:ref_provider/oauth', AuthenticationController.requireLogin(),  ReferencesApiHandler.startAuth
		app.get  '/:ref_provider/oauth/token-exchange', AuthenticationController.requireLogin(),  ReferencesApiHandler.completeAuth
		app.post '/:ref_provider/unlink', AuthenticationController.requireLogin(),  ReferencesApiHandler.unlink
		app.get  '/:ref_provider/bibtex', AuthenticationController.requireLogin(),  ReferencesApiHandler.bibtex
		app.get  '/:ref_provider/groups', AuthenticationController.requireLogin(),  ReferencesApiHandler.groups
		app.post '/project/:Project_id/:ref_provider/bibtex/import', AuthenticationController.requireLogin(),  ReferencesApiHandler.importBibtex
