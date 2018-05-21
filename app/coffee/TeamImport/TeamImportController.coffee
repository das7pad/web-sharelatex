logger = require "logger-sharelatex"
TeamImporter = require "./TeamImporter"

module.exports = TeamImportController =
	create: (req, res, next) ->
		TeamImporter.getOrImportTeam req.params.teamId, (error, v2Team) ->
			return next(error) if error?

			res.json v2Team
