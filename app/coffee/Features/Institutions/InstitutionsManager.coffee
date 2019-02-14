logger = require 'logger-sharelatex'
async = require 'async'
db = require("../../infrastructure/mongojs").db
_ = require("underscore")
ObjectId = require("../../infrastructure/mongojs").ObjectId
{ getInstitutionAffiliations } = require('./InstitutionsAPI')
FeaturesUpdater = require('../Subscription/FeaturesUpdater')
UserGetter = require('../User/UserGetter')
NotificationsBuilder = require("../Notifications/NotificationsBuilder")
SubscriptionLocator = require("../Subscription/SubscriptionLocator")
Institution = require("../../models/Institution").Institution

ASYNC_LIMIT = 10
module.exports = InstitutionsManager =
	upgradeInstitutionUsers: (institutionId, callback = (error) ->) ->
		institution = null
		async.waterfall [
			(cb) ->
				Institution.findOne {v1Id: institutionId}, (err, institution) -> cb(err, institution)
			(i, cb) ->
				i.fetchV1Data  (err, institution) -> cb(err, institution)
			(i, cb) ->
				institution = i
				getInstitutionAffiliations institutionId, (err, affiliations) -> cb(err, affiliations)
			(affiliations, cb) ->
				affiliations = _.map affiliations, (affiliation) ->
					affiliation.institutionName = institution.name
					affiliation.institutionId = institutionId
					return affiliation
				async.eachLimit affiliations, ASYNC_LIMIT, refreshFeatures, (err) -> cb(err)
		], callback

	checkInstitutionUsers: (institutionId, callback = (error) ->) ->
		getInstitutionAffiliations institutionId, (error, affiliations) ->
			UserGetter.getUsersByAnyConfirmedEmail(
				affiliations.map((affiliation) -> affiliation.email),
				{ features: 1 },
				(error, users) -> 
					callback(error, checkFeatures(users))
				)

refreshFeatures = (affiliation, callback) ->
	userId = ObjectId(affiliation.user_id)
	user = null
	subscription = null
	featuresChanged = false
	async.waterfall [
		(cb) ->
			FeaturesUpdater.refreshFeatures userId, true, (err, features, featuresChanged) -> cb(err, featuresChanged)
		(changed, cb) ->
			featuresChanged = changed
			UserGetter.getUser userId, (err, user) -> cb(err, user)
		(u, cb) ->
			user = u
			SubscriptionLocator.getUsersSubscription u, (err, subscription) -> cb(err, subscription)
		(s, cb) ->
			subscription = s
			if featuresChanged
				NotificationsBuilder.featuresUpgradedByAffiliation(affiliation, user).create (err)-> cb(err)
			else
				cb()
		(cb) ->
			if subscription? and !subscription.planCode.match(/(free|trial)/)? and !subscription.groupPlan
				NotificationsBuilder.redundantPersonalSubscription(affiliation, user).create (err)-> cb(err)
			else
				cb()
	], callback

checkFeatures = (users) ->
	usersSummary = {
		totalConfirmedUsers: users.length
		totalConfirmedProUsers: 0
		totalConfirmedNonProUsers: 0
		confirmedNonProUsers: []
	}
	users.forEach((user) -> 
		if user.features.collaborators == -1 and user.features.trackChanges
			usersSummary.totalConfirmedProUsers += 1
		else
			usersSummary.totalConfirmedNonProUsers += 1
			usersSummary.confirmedNonProUsers.push user._id
	)
	return usersSummary
