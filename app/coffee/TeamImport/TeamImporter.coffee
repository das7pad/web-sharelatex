logger = require "logger-sharelatex"
settings = require "settings-sharelatex"
UserMapper = require "../OverleafUsers/UserMapper"
SubscriptionUpdater = require "../../../../../app/js/Features/Subscription/SubscriptionUpdater"
TeamInvitesHandler = require "../../../../../app/js/Features/Subscription/TeamInvitesHandler"
Subscription = require("../../../../../app/js/models/Subscription").Subscription
async = require "async"

importTeam = (origV1Team, callback = (error, v2TeamId) ->) ->
	createV2TeamFromV1Team = (cb) -> createV2Team origV1Team, cb

	async.waterfall [
		createV2TeamFromV1Team,
		importTeamMembers,
		importPendingInvites,
	], (error, v1Team, v2Team) ->
	  return rollback(origV1Team, error, callback) if error?
	  callback(null, v2Team)

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


rollback = (v1Team, originalError, callback) ->
	Subscription.deleteOne { "overleaf.id": v1Team.id }, (error) ->
		return callback(error) if error?
		return callback(originalError)

module.exports = TeamImporter =
	getOrImportTeam: (v1Team, callback = (error, v2Team) ->) ->
		Subscription.findOne { "overleaf.id": v1Team.id }, (error, subscription) ->
			return callback(error) if error?
			return callback(null, subscription) if subscription?

			importTeam(v1Team, callback)
