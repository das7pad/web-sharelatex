logger = require "logger-sharelatex"
UserMapper = require "../OverleafUsers/UserMapper"
SubscriptionUpdater = require "../../../../../app/js/Features/Subscription/SubscriptionUpdater"
TeamInvitesHandler = require "../../../../../app/js/Features/Subscription/TeamInvitesHandler"
SubscriptionLocator = require("../../../../../app/js/Features/Subscription/SubscriptionLocator")
UserGetter = require('../../../../../app/js/Features/User/UserGetter')
Subscription = require("../../../../../app/js/models/Subscription").Subscription
async = require "async"
Errors = require './Errors'
_ = require "underscore"

importTeam = (origV1Team, callback = (error, v2TeamId) ->) ->
	createV2TeamFromV1Team = (cb) -> createV2Team origV1Team, cb

	async.waterfall [
		createV2TeamFromV1Team,
		importTeamManagers,
		importTeamMembers,
		importPendingInvites,
	], (error, v1Team, v2Team) ->
		return rollback(origV1Team, error, callback) if error?
		callback(null, v2Team)

createV2Team = (v1Team, callback = (error, v1Team, v2Team) ->) ->
	UserGetter.getUser { 'overleaf.id': v1Team.owner.id }, { _id: 1 }, (error, teamAdmin) ->
		return callback(error) if error?
		teamAdminId = teamAdmin?._id
		return callback(new Errors.UserNotFoundError('Team admin does not exist in v2')) unless teamAdminId?

		SubscriptionLocator.getUsersSubscription teamAdminId, (error, existingSubscription) ->
			return callback(error) if error?
			return callback(new Errors.MultipleSubscriptionsError("Team admin already has a subscription in v2")) if existingSubscription?

			subscription = new Subscription(
				overleaf:
					id: v1Team.id
				teamName: v1Team.name
				admin_id: teamAdminId
				manager_ids: [teamAdminId]
				groupPlan: true
				planCode: "v1_#{v1Team.plan_name}"
				membersLimit: v1Team.n_licences
			)

			subscription.save (error) ->
				return callback(error) if error?
				logger.log {subscription}, "[TeamImporter] Created v2 team"
				return callback(null, v1Team, subscription)

importTeamMembers = (v1Team, v2Team, callback = (error, v1Team, v2Team) ->) ->
	async.map v1Team.users, UserMapper.getSlIdFromOlUser, (error, memberIds) ->
		return callback(error) if error?

		memberIds = memberIds.map (mId) -> mId.toString()

		SubscriptionUpdater.addUsersToGroup v2Team._id, memberIds, (error, updated) ->
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

importTeamManagers = (v1Team, v2Team, callback = (error, v1Team, v2Team) ->) ->
	async.map v1Team.managers, getManagerSlId, (error, managerIds) ->
		return callback(error) if error?

		managerIds.push(v2Team.admin_id)
		managerIds = _.compact(managerIds).map (id) -> id.toString()
		v2Team.manager_ids = _.uniq(managerIds)

		v2Team.save (error) ->
			return callback(error) if error?
			logger.log {managerIds: v2Team.manager_ids}, "[TeamImporter] Managers added to the team #{v2Team.id}"
			callback(null, v1Team, v2Team)

getManagerSlId = (v1User, callback = (error, v2ManagerId) ->) ->
	UserMapper.getSlIdFromOlUser v1User, (error, v2ManagerId) ->
		return callback(error) if error?

		SubscriptionLocator.findManagedSubscription v2ManagerId, (error, existingSubscription) ->
			return callback(error) if error?
			return callback(null, null) if existingSubscription?
			return callback(null, v2ManagerId)

rollback = (v1Team, originalError, callback) ->
	SubscriptionUpdater.deleteWithV1Id v1Team.id, (error) ->
		return callback(error) if error?
		return callback(originalError)

module.exports = TeamImporter =
	getOrImportTeam: (v1Team, callback = (error, v2Team) ->) ->
		SubscriptionLocator.getGroupWithV1Id v1Team.id, (error, subscription) ->
			return callback(error) if error?
			return callback(null, subscription) if subscription?

			importTeam(v1Team, callback)
