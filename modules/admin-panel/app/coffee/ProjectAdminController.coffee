logger = require "logger-sharelatex"
metrics = require "metrics-sharelatex"
_ = require "underscore"
Path = require("path")
UserGetter = require "../../../../app/js/Features/User/UserGetter"
{User} = require("../../../../app/js/models/User")
ProjectGetter = require "../../../../app/js/Features/Project/ProjectGetter"
FeaturesUpdater = require("../../../../app/js/Features/Subscription/FeaturesUpdater")
async = require "async"
settings = require "settings-sharelatex"


module.exports = ProjectAdminController =

	show: (req, res, next) ->
		logger.log "getting admin request for list of users"
		ProjectGetter.getProject req.params.Project_id, (err, project) ->
			return next(err) if err?
			res.render Path.resolve(__dirname, "../views/project/show"), { project }
