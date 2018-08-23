logger = require "logger-sharelatex"
TeamImporter = require "./TeamImporter"
Errors = require "./Errors"

module.exports = TeamImportController =
	create: (req, res, next) ->
		TeamImporter.getOrImportTeam req.body.team, (error, v2Team) ->
			if error?
				isArgumentError =
					error instanceof Errors.MultipleSubscriptionsError or
					error instanceof Errors.UserNotFoundError
				return res.status(422).json error: error.message if isArgumentError
				return next(error)

			v2TeamView = {
				id: v2Team.id,
				overleaf:
					id: v2Team.overleaf.id
				member_ids: v2Team.member_ids
			}

			res.json v2TeamView
