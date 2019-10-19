logger = require "logger-sharelatex"
metrics = require "metrics-sharelatex"
_ = require "underscore"
Path = require("path")
UserGetter = require "../../../../app/js/Features/User/UserGetter"
{User} = require("../../../../app/js/models/User")
ProjectGetter = require "../../../../app/js/Features/Project/ProjectGetter"
ProjectOptionsHandler = require "../../../../app/js/Features/Project/ProjectOptionsHandler"
FeaturesUpdater = require("../../../../app/js/Features/Subscription/FeaturesUpdater")
async = require "async"
settings = require "settings-sharelatex"


module.exports = ProjectAdminController =

	show: (req, res, next) ->
		logger.log "getting admin request for list of users"
		ProjectGetter.getProject req.params.Project_id, (err, project) ->
			return next(err) if err?
			res.render Path.resolve(__dirname, "../views/project/show"), { project }

	updateBrandVariationId: (req, res, next) ->
		projectId = req.params.Project_id
		brandVariationId = req.body.brandVariationId.trim()
		logger.info {projectId, brandVariationId}, "[ProjectAdminController] setting brandVariationId on project"
		done = () ->
			res.status(204).send()
		if !brandVariationId
			ProjectOptionsHandler.unsetBrandVariationId projectId, done
		else
			if !parseInt(brandVariationId)
				logger.info {projectId, brandVariationId}, "[ProjectAdminController] invalid brandVariationId"
				return res.status(400).send()
			else
				ProjectOptionsHandler.setBrandVariationId projectId, brandVariationId, done
