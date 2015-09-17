AdminController = require("./AdminController")
AdminGraphController = require("./AdminGraphController")
SecurityManager = require('../../../../app/js/managers/SecurityManager')
ProjectController = require("../../../../app/js/Features/Project/ProjectController")

module.exports = 
	apply: (webRouter, apiRouter) ->

		webRouter.get "/admin/user", SecurityManager.requestIsAdmin, AdminController.listUsers
		webRouter.post "/admin/user/search", SecurityManager.requestIsAdmin, AdminController.searchUsers
		webRouter.get "/admin/user/:user_id", SecurityManager.requestIsAdmin, AdminController.getUserInfo
		webRouter.post "/admin/user/:user_id/setPassword", SecurityManager.requestIsAdmin, AdminController.setUserPassword
		webRouter.delete "/admin/user/:user_id", SecurityManager.requestIsAdmin, AdminController.deleteUser
		webRouter.get "/admin/user/graph/:user_id", SecurityManager.requestIsAdmin, AdminGraphController.userGraph
		webRouter.delete "/admin/Project/:Project_id", SecurityManager.requestIsAdmin, ProjectController.deleteProject
