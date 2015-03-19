PublicRegistrationController = require("./PublicRegistrationController")

module.exports = 
	apply: (app) ->
		console.log "LOADING module routes"
		removeRoute app, "get", "/register"
		app.get "/register", PublicRegistrationController.showRegisterPage
		app.post "/register", PublicRegistrationController.register

removeRoute = (app, method, path)->
	console.log app.routes.get
	index = null
	for route, i in app.routes[method]
		if route.path == path
			index = i
	console.log "removing route at index", i
	# routeIndex = _.findIndex app.routes.get, (appRoute)->
	# 	appRoute?.path == route
	if index?
		app.routes[method].splice(index,1)