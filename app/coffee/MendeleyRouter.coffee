AuthenticationController = require "../../../../app/js/Features/Authentication/AuthenticationController"
MendeleyAuthHandler = require("./MendeleyAuthHandler")
ReferencesApiHandler = require("./ReferencesApiHandler")
RefmeApiHandler = require("./RefmeApiHandler")

module.exports =
	apply: (app) ->
		app.get '/mendeley/oauth', AuthenticationController.requireLogin(),  ReferencesApiHandler.startAuth
		app.get '/mendeley/oauth/token-exchange', AuthenticationController.requireLogin(),  ReferencesApiHandler.completeAuth
		app.post '/mendeley/unlink', AuthenticationController.requireLogin(),  MendeleyAuthHandler.unlink
		app.get '/mendeley/reindex', AuthenticationController.requireLogin(),  ReferencesApiHandler.reindex
		app.get '/refme/oauth', AuthenticationController.requireLogin(),  RefmeApiHandler.startAuth
		app.get '/refme/oauth/token-exchange', AuthenticationController.requireLogin(),  RefmeApiHandler.completeAuth