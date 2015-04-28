AdminController = require("./AdminController")

module.exports = 
	apply: (app) ->
		app.get "/adminpanel", AdminController.renderAdminPanel

