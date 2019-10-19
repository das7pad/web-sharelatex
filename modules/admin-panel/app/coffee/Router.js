UserAdminController = require("./UserAdminController")
ProjectAdminController = require("./ProjectAdminController")
SubscriptionAdminController = require("./SubscriptionAdminController")
GraphController = require("./GraphController")
AuthorizationMiddleware = require('../../../../app/js/Features/Authorization/AuthorizationMiddleware')
ProjectController = require("../../../../app/js/Features/Project/ProjectController")
express = require "express"


module.exports =
	apply: (webRouter, apiRouter) ->
		adminRouter = express.Router()
		webRouter.use "/admin", adminRouter
		
		adminRouter.use(AuthorizationMiddleware.ensureUserIsSiteAdmin)
		adminRouter.get    "/user",          UserAdminController.index
		adminRouter.post   "/user/search",   UserAdminController.search
		adminRouter.get    "/user/:user_id", UserAdminController.show
		adminRouter.post   "/user/:user_id", UserAdminController.update
		adminRouter.delete "/user/:user_id", UserAdminController.delete
		adminRouter.delete "/user/:user_id/overleaf", UserAdminController.deleteOverleafV1Link
		adminRouter.delete "/user/:user_id/secondaryemail", UserAdminController.deleteSecondaryEmail
		adminRouter.post   "/user/:user_id/refresh_features", UserAdminController.refreshFeatures


		adminRouter.post   "/user/:user_id/email", UserAdminController.updateEmail
		
		adminRouter.get    "/user/:user_id/subscription/new",              SubscriptionAdminController.new
		adminRouter.get    "/user/:user_id/subscription/:subscription_id", SubscriptionAdminController.show
		adminRouter.post   "/subscription",                  SubscriptionAdminController.create
		adminRouter.post   "/subscription/:subscription_id", SubscriptionAdminController.update
		adminRouter.delete "/subscription/:subscription_id", SubscriptionAdminController.delete
	
		adminRouter.get    "/user/graph/:user_id", GraphController.userGraph
		adminRouter.delete "/project/:Project_id", ProjectController.deleteProject

		adminRouter.get    "/project/:Project_id", ProjectAdminController.show
		adminRouter.post    "/project/:Project_id/brandVariationId", ProjectAdminController.updateBrandVariationId
