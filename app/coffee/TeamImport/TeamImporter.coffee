logger = require "logger-sharelatex"
settings = require "settings-sharelatex"
_ = require("underscore")
UserMapper = require "../OverleafUsers/UserMapper"
SubscriptionUpdater = require "../../../../../app/js/Features/Subscription/SubscriptionUpdater"
TeamInvitesHandler = require "../../../../../app/js/Features/Subscription/TeamInvitesHandler"
Subscription = require("../../../../../app/js/models/Subscription").Subscription
async = require "async"
request = require "request"

importTeam = (v1TeamId, callback = (error, v2TeamId) ->) ->
	logger.log {v1TeamId}, "[TeamImporter] importing team from v1"

	startImportInV1WithId = (cb) -> startImportInV1 v1TeamId, cb

	async.waterfall [
		startImportInV1WithId,
		createV2Team,
		importTeamMembers,
		importPendingInvites,
		confirmImportInV1,
	], (error, v1Team, v2Team) ->
	  return rollback(v1TeamId, error, callback) if error?
	  callback(null, v2Team)

startImportInV1 = (v1TeamId, callback = (error, v1Team) ->) ->
	v1Request {
		url: "#{settings.apis.v1.host}/api/v1/sharelatex/team_exports/#{v1TeamId}/"
		method: "POST"
	}, (error, v1Team) ->
		return callback(error) if error?
		logger.log {v1Team}, "[TeamImporter] Got team from v1"
		return callback(null, v1Team)

createV2Team = (v1Team, callback = (error, v2Team) ->) ->
	UserMapper.getSlIdFromOlUser v1Team.owner, (error, teamAdmin) ->
		return callback(error) if error?

		subscription = new Subscription(
			overleaf:
				id: v1Team.id
			admin_id: teamAdmin._id
			groupPlan: true
			membersLimit: v1Team.n_licences
		)

		subscription.save (error) ->
			return callback(error) if error?
			logger.log {subscription}, "[TeamImporter] Created v2 team"
			return callback(null, v1Team, subscription)

importTeamMembers = (v1Team, v2Team, callback = (error, v1Team, v2Team) ->) ->
	async.map v1Team.users, UserMapper.getSlIdFromOlUser, (error, memberIds) ->
		return callback(error) if error?
		Subscription.update { _id: v2Team.id }, { member_ids: memberIds }, (error, updated) ->
			callback(error) if error?
			logger.log {memberIds}, "[TeamImporter] Members added to the team #{v2Team.id}"
			callback(null, v1Team, v2Team)

importPendingInvites = (v1Team, v2Team, callback = (error, v1Team, v2Team) ->) ->
	importInvite = (pendingInvite, cb) ->
		logger.log "[TeamImporter] Importing invite", pendingInvite
		TeamInvitesHandler.importInvite(v2Team, v1Team.name, pendingInvite.email,
			pendingInvite.code, pendingInvite.updated_at, cb)

	async.map v1Team.pending_invites, importInvite, (error, invites) ->
		callback(error, v1Team, v2Team)

confirmImportInV1 = (v1Team, v2Team, callback = (error) ->) ->
	v1Request {
		url: "#{settings.apis.v1.host}/api/v1/sharelatex/team_exports/#{v1Team.id}/"
		method: "PATCH",
		json: true,
		body: { v2_id: v2Team.id }
	}, (error, team) ->
		return callback(error) if error?
		logger.log {v1TeamId: v1Team.id}, "[TeamImporter] Import confirmed in v1"
		return callback(null, v1Team, v2Team)


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

	logger.log "[TeamImporter] Calling v1", params.method, params.url

	request params, (err, response, body) ->
		return callback(err) if err?

		statusCode = response.statusCode

		if statusCode >= 200 and statusCode < 300
			return callback(null, body)
		else
			err = new Error(
				"[TeamImporter] got non-200 response from v1: #{statusCode}"
			)
			logger.err {err, params}, err.message
			return callback(err)

module.exports = TeamImporter =

	getOrImportTeam: (v1TeamId, callback = (error, v2Team) ->) ->
		Subscription.findOne { "overleaf.id": v1TeamId }, (error, subscription) ->
			return callback(error) if error?
			return callback(null, subscription) if subscription?

			importTeam(v1TeamId, callback)
