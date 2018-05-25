logger = require "logger-sharelatex"
settings = require "settings-sharelatex"
_ = require("underscore")
UserMapper = require "../OverleafUsers/UserMapper"
SubscriptionUpdater = require "../../../../../app/js/Features/Subscription/SubscriptionUpdater"
Subscription = require("../../../../../app/js/models/Subscription").Subscription
async = require "async"
request = require "request"


importTeam = (v1TeamId, callback = (error, v2TeamId) ->) ->
	logger.log {v1TeamId}, "importing team from v1"

	startImportInV1 v1TeamId, (error, v1Team) ->
		return rollback(v1TeamId, error, callback) if error?
		logger.log {v1Team}, "got team from v1"

		createV2Team v1Team, (error, v2Team) ->
			return rollback(v1TeamId, error, callback) if error?
			logger.log {v2Team}, "Created v2 team"

			importTeamMembers v1Team, v2Team, (error, memberIds) ->
				return rollback(v1TeamId, error, callback) if error?
				logger.log {memberIds}, "Members added to the team"

				confirmImportInV1 v1TeamId, v2Team.id, (error) ->
					return rollback(v1TeamId, error, callback) if error?
					logger.log {v1Team}, "Import confirmed in v1"

					return callback(null, v2Team)

startImportInV1 = (v1TeamId, callback = (error, v1Team) ->) ->
	v1Request {
		url: "#{settings.apis.v1.host}/api/v1/sharelatex/team_exports/#{v1TeamId}/"
		method: "POST"
	}, callback

createV2Team = (v1Team, callback = (error, v2Team) ->) ->
	UserMapper.getSlIdFromOlUser v1Team.owner, (error, teamAdmin) ->
		return callback(error) if error?

		Subscription.create {
			overleaf:
				id: v1Team.id
			admin_id: teamAdmin._id
		}, (error, subscriptionReturned) ->
			return callback(error) if error?
			Subscription.findOne { "overleaf.id": v1Team.id }, (error, subscription) ->
				return callback(error) if error?
				return callback(null, subscription)

importTeamMembers = (v1Team, v2Team, callback = (error, memberIds) ->) ->
	jobs = v1Team.users.map (u) ->
		(cb) -> UserMapper.getSlIdFromOlUser(u, cb)

	async.series jobs, (error, memberIds) ->
		return callback(error) if error?
		Subscription.update { _id: v2Team.id }, { member_ids: memberIds }, (error, updated) ->
			callback(error, memberIds)

confirmImportInV1 = (v1TeamId, v2TeamId, callback = (error) ->) ->
	v1Request {
		url: "#{settings.apis.v1.host}/api/v1/sharelatex/team_exports/#{v1TeamId}/"
		method: "PATCH",
		json: true,
		body: { v2_id: v2TeamId }
	}, (error, team) ->
		return callback(error)

rollback = (v1TeamId, originalError, callback) ->
	v1Request {
		url: "#{settings.apis.v1.host}/api/v1/sharelatex/team_exports/#{v1TeamId}/"
		method: "DELETE"
	}, (error, team) ->
		return callback(error) if error?

		Subscription.deleteOne { "overleaf.id": v1TeamId }, (error) ->
			return callback(error) if error?

			return callback(originalError)

DEFAULT_V1_PARAMS = {
	auth:
		user: settings.apis.v1.user
		pass: settings.apis.v1.pass
	json: true,
	timeout: 5 * 1000
}

v1Request = (params, callback = (error, result) -> ) ->
	params = Object.assign({}, DEFAULT_V1_PARAMS, params)

	logger.log "Calling v1", params.method, params.url

	request params, (err, response, body) ->
		return callback(err) if err?

		statusCode = response.statusCode

		if statusCode >= 200 and statusCode < 300
			return callback(null, body)
		else
			err = new Error(
				"[V1TeamImport] got non-200 response from v1: #{statusCode}"
			)
			logger.err {err, params}, err.message
			return callback(err)

module.exports = TeamImporter =

	getOrImportTeam: (v1TeamId, callback = (error, v2Team) ->) ->
		Subscription.findOne { "overleaf.id": v1TeamId }, (error, subscription) ->
			return callback(error) if error?
			return callback(null, subscription) if subscription?

			importTeam(v1TeamId, callback)
