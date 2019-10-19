/* eslint-disable
    max-len,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const UserAdminController = require("./UserAdminController");
const ProjectAdminController = require("./ProjectAdminController");
const SubscriptionAdminController = require("./SubscriptionAdminController");
const GraphController = require("./GraphController");
const AuthorizationMiddleware = require('../../../../app/js/Features/Authorization/AuthorizationMiddleware');
const ProjectController = require("../../../../app/js/Features/Project/ProjectController");
const express = require("express");


module.exports = {
	apply(webRouter, apiRouter) {
		const adminRouter = express.Router();
		webRouter.use("/admin", adminRouter);
		
		adminRouter.use(AuthorizationMiddleware.ensureUserIsSiteAdmin);
		adminRouter.get("/user",          UserAdminController.index);
		adminRouter.post("/user/search",   UserAdminController.search);
		adminRouter.get("/user/:user_id", UserAdminController.show);
		adminRouter.post("/user/:user_id", UserAdminController.update);
		adminRouter.delete("/user/:user_id", UserAdminController.delete);
		adminRouter.delete("/user/:user_id/overleaf", UserAdminController.deleteOverleafV1Link);
		adminRouter.delete("/user/:user_id/secondaryemail", UserAdminController.deleteSecondaryEmail);
		adminRouter.post("/user/:user_id/refresh_features", UserAdminController.refreshFeatures);


		adminRouter.post("/user/:user_id/email", UserAdminController.updateEmail);
		
		adminRouter.get("/user/:user_id/subscription/new",              SubscriptionAdminController.new);
		adminRouter.get("/user/:user_id/subscription/:subscription_id", SubscriptionAdminController.show);
		adminRouter.post("/subscription",                  SubscriptionAdminController.create);
		adminRouter.post("/subscription/:subscription_id", SubscriptionAdminController.update);
		adminRouter.delete("/subscription/:subscription_id", SubscriptionAdminController.delete);
	
		adminRouter.get("/user/graph/:user_id", GraphController.userGraph);
		adminRouter.delete("/project/:Project_id", ProjectController.deleteProject);

		adminRouter.get("/project/:Project_id", ProjectAdminController.show);
		return adminRouter.post("/project/:Project_id/brandVariationId", ProjectAdminController.updateBrandVariationId);
	}
};
