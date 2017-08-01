UserController = require("./UserController")
SubscriptionController = require("./SubscriptionController")
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
		
		adminRouter.get    "/user/:user_id/subscription/new",              SubscriptionController.new
		adminRouter.get    "/user/:user_id/subscription/:subscription_id", SubscriptionController.show
		adminRouter.post   "/subscription",                  SubscriptionController.create
		adminRouter.post   "/subscription/:subscription_id", SubscriptionController.update
		adminRouter.delete "/subscription/:subscription_id", SubscriptionController.delete
	
		adminRouter.get    "/user/graph/:user_id", GraphController.userGraph
		adminRouter.delete "/project/:Project_id", ProjectController.deleteProject
