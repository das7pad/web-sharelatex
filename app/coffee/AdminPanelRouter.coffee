AdminController = require("./AdminController")
AdminGraphController = require("./AdminGraphController")
SecurityManager = require('../../../../app/js/managers/SecurityManager')
ProjectController = require("../../../../app/js/Features/Project/ProjectController")

module.exports = 
	apply: (app) ->

		app.get "/admin/user", SecurityManager.requestIsAdmin, AdminController.listUsers
		app.post "/admin/user/search", SecurityManager.requestIsAdmin, AdminController.searchUsers
		app.get "/admin/user/:user_id", SecurityManager.requestIsAdmin, AdminController.getUserInfo
		app.post "/admin/user/:user_id/setPassword", SecurityManager.requestIsAdmin, AdminController.setUserPassword
		app.del "/admin/user/:user_id", SecurityManager.requestIsAdmin, AdminController.deleteUser
		app.get "/admin/user/graph/:user_id", SecurityManager.requestIsAdmin, AdminGraphController.userGraph
		app.get "/admin/Project/:Project_id", SecurityManager.requestIsAdmin, ProjectController.loadEditor
		app.del "/admin/Project/:Project_id", SecurityManager.requestIsAdmin, ProjectController.deleteProject
