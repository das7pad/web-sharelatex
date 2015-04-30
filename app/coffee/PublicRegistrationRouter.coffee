AdminController = require("./AdminController")
SecurityManager = require('../../../../app/js/managers/SecurityManager')

module.exports = 
	apply: (app) ->
		app.get "/adminpanel", SecurityManager.requestIsAdmin, AdminController.renderAdminPanel
		app.get "/admin/listUsers", SecurityManager.requestIsAdmin, AdminController.listUsers
		app.get "/admin/searchUsers", SecurityManager.requestIsAdmin, AdminController.searchUsers
