AdminController = require("./AdminController")
AdminGraphController = require("./AdminGraphController")
AuthorizationMiddlewear = require('../../../../app/js/Features/Authorization/AuthorizationMiddlewear')
ProjectController = require("../../../../app/js/Features/Project/ProjectController")

module.exports =
	apply: (webRouter, apiRouter) ->

		webRouter.get "/admin/user", AuthorizationMiddlewear.ensureUserIsSiteAdmin, AdminController.listUsers
		webRouter.post "/admin/user/search", AuthorizationMiddlewear.ensureUserIsSiteAdmin, AdminController.searchUsers
		webRouter.get "/admin/user/:user_id", AuthorizationMiddlewear.ensureUserIsSiteAdmin, AdminController.getUserInfo
		webRouter.post "/admin/user/:user_id/setPassword", AuthorizationMiddlewear.ensureUserIsSiteAdmin, AdminController.setUserPassword
		webRouter.delete "/admin/user/:user_id", AuthorizationMiddlewear.ensureUserIsSiteAdmin, AdminController.deleteUser
		webRouter.get "/admin/user/graph/:user_id", AuthorizationMiddlewear.ensureUserIsSiteAdmin, AdminGraphController.userGraph
		webRouter.delete "/admin/Project/:Project_id", AuthorizationMiddlewear.ensureUserIsSiteAdmin, ProjectController.deleteProject
		webRouter.post "/admin/user/:user_id/enableBeta", AuthorizationMiddlewear.ensureUserIsSiteAdmin, AdminController.enableBeta
