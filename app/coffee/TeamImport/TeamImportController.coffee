logger = require "logger-sharelatex"
TeamImporter = require "./TeamImporter"

module.exports = TeamImportController =
	create: (req, res, next) ->
		TeamImporter.getOrImportTeam req.params.teamId, (error, v2Team) ->
			return next(error) if error?

			v2TeamView = {
				id: v2Team.id,
				overleaf:
					id: v2Team.overleaf.id
				member_ids: v2Team.member_ids
			}

			res.json v2TeamView
