AdminController = require("./AdminController")
SecurityManager = require('../../../../app/js/managers/SecurityManager')

module.exports = 
	apply: (app) ->
		app.get "/adminpanel", SecurityManager.requestIsAdmin, AdminController.renderAdminPanel
		app.get "/admin/listUsers", SecurityManager.requestIsAdmin, AdminController.listUsers
		app.post "/admin/searchUsers", SecurityManager.requestIsAdmin, AdminController.searchUsers
		app.get "/admin/user/:user_id", SecurityManager.requestIsAdmin, AdminController.getUserInfo
