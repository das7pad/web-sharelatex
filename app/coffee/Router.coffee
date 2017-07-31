UserController = require("./UserController")
GraphController = require("./GraphController")
AuthorizationMiddlewear = require('../../../../app/js/Features/Authorization/AuthorizationMiddlewear')
ProjectController = require("../../../../app/js/Features/Project/ProjectController")
express = require "express"


module.exports =
	apply: (webRouter, apiRouter) ->
		adminRouter = express.Router()
		webRouter.use "/admin", adminRouter
		
		adminRouter.use(AuthorizationMiddlewear.ensureUserIsSiteAdmin)
		adminRouter.get    "/user",          UserController.index
		adminRouter.post   "/user/search",   UserController.search
		adminRouter.get    "/user/:user_id", UserController.show
		adminRouter.post   "/user/:user_id", UserController.update
		adminRouter.delete "/user/:user_id", UserController.delete
		adminRouter.post   "/user/:user_id/setBetaStatus", UserController.setBetaStatus
		
		adminRouter.get    "/user/graph/:user_id", GraphController.userGraph
		adminRouter.delete "/project/:Project_id", ProjectController.deleteProject
