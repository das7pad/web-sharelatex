/* eslint-disable
    max-len,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let ProjectAdminController;
const logger = require("logger-sharelatex");
const metrics = require("metrics-sharelatex");
const _ = require("underscore");
const Path = require("path");
const UserGetter = require("../../../../app/js/Features/User/UserGetter");
const {User} = require("../../../../app/js/models/User");
const ProjectGetter = require("../../../../app/js/Features/Project/ProjectGetter");
const ProjectOptionsHandler = require("../../../../app/js/Features/Project/ProjectOptionsHandler");
const FeaturesUpdater = require("../../../../app/js/Features/Subscription/FeaturesUpdater");
const async = require("async");
const settings = require("settings-sharelatex");


module.exports = (ProjectAdminController = {

	show(req, res, next) {
		logger.log("getting admin request for list of users");
		return ProjectGetter.getProject(req.params.Project_id, function(err, project) {
			if (err != null) { return next(err); }
			return res.render(Path.resolve(__dirname, "../views/project/show"), { project });
	});
	},

	updateBrandVariationId(req, res, next) {
		const projectId = req.params.Project_id;
		const brandVariationId = req.body.brandVariationId.trim();
		logger.info({projectId, brandVariationId}, "[ProjectAdminController] setting brandVariationId on project");
		const done = () => res.status(204).send();
		if (!brandVariationId) {
			return ProjectOptionsHandler.unsetBrandVariationId(projectId, done);
		} else {
			if (!parseInt(brandVariationId)) {
				logger.info({projectId, brandVariationId}, "[ProjectAdminController] invalid brandVariationId");
				return res.status(400).send();
			} else {
				return ProjectOptionsHandler.setBrandVariationId(projectId, brandVariationId, done);
			}
		}
	}
});
