logger = require "logger-sharelatex"
metrics = require "metrics-sharelatex"
_ = require "underscore"
Path = require("path")
UserGetter = require "../../../../app/js/Features/User/UserGetter"
UserAdminController = require("./UserAdminController")
SubscriptionLocator = require("../../../../app/js/Features/Subscription/SubscriptionLocator")
SubscriptionUpdater = require("../../../../app/js/Features/Subscription/SubscriptionUpdater")
FeaturesUpdater = require("../../../../app/js/Features/Subscription/FeaturesUpdater")
Subscription = require("../../../../app/js/models/Subscription").Subscription
ErrorController = require("../../../../app/js/Features/Errors/ErrorController")
async = require "async"

module.exports = SubscriptionAdminController =
	show: (req, res, next)->
		# The user_id isn't used in the look up, it just provides a nice
		# breadcrumb trail of where we came from for navigation
		{subscription_id, user_id} = req.params
		logger.log {subscription_id}, "getting admin request for subscription"
		SubscriptionLocator.getSubscription subscription_id, (err, subscription) ->
			return next(err) if err?
			if !subscription?
				return ErrorController.notFound req, res
			UserGetter.getUsers subscription.member_ids, { email: 1 }, (err, members) ->
				return next(err) if err?
				managerIds = subscription.manager_ids || []
				UserGetter.getUsers managerIds, { email: 1 }, (err, managers) ->
					return next(err) if err?
					res.render Path.resolve(__dirname, "../views/subscription/show"),
						{subscription, user_id, members, managers}

	ALLOWED_ATTRIBUTES: [
		'recurlySubscription_id',
		'planCode',
		'membersLimit',
		'groupPlan',
		'customAccount'
	]
	BOOLEAN_ATTRIBUTES: ['groupPlan', 'customAccount']
	update: (req, res, next) ->
		{subscription_id, user_id} = req.params
		update = UserAdminController._reqToMongoUpdate(
			req.body,
			SubscriptionAdminController.ALLOWED_ATTRIBUTES,
			SubscriptionAdminController.BOOLEAN_ATTRIBUTES
		)
		logger.log {subscription_id, update}, "updating subscription via admin panel"
		Subscription.findAndModify {_id: subscription_id}, { $set: update }, (error, subscription) ->
			return next(error) if error?
			async.eachSeries(
				[subscription.admin_id].concat(subscription.member_ids)
				, (user_id, callback) ->
					FeaturesUpdater.refreshFeatures user_id, true, callback
				, (error) ->
					return next(error) if error?
					res.sendStatus 204
			)

	new: (req, res, next) ->
		res.render Path.resolve(__dirname, "../views/subscription/new"), {
			admin_id: req.params.user_id
		}

	create: (req, res, next) ->
		update = UserAdminController._reqToMongoUpdate(
			req.body,
			SubscriptionAdminController.ALLOWED_ATTRIBUTES,
			SubscriptionAdminController.BOOLEAN_ATTRIBUTES
		)
		update.admin_id = req.body.admin_id
		update.manager_ids = [req.body.admin_id]
		logger.log {update}, "creating subscription via admin panel"
		new Subscription(update).save (error, subscription) ->
			return next(error) if error?
			res.json {subscription}

	delete: (req, res)->
		subscription_id = req.params.subscription_id
		logger.log subscription_id: subscription_id, "received admin request to delete subscription"
		SubscriptionUpdater.deleteSubscription subscription_id, (err) ->
			return next(err) if err?
			res.sendStatus 204
