logger = require "logger-sharelatex"
metrics = require "metrics-sharelatex"
_ = require "underscore"
Path = require("path")
UserController = require("./UserController")
SubscriptionLocator = require("../../../../app/js/Features/Subscription/SubscriptionLocator")
SubscriptionUpdater = require("../../../../app/js/Features/Subscription/SubscriptionUpdater")
Subscription = require("../../../../app/js/models/Subscription").Subscription
ErrorController = require("../../../../app/js/Features/Errors/ErrorController")
async = require "async"

mongojs = require("../../../../app/js/infrastructure/mongojs")
db = mongojs.db
ObjectId = mongojs.ObjectId

module.exports = SubscriptionController =
	ATTRIBUTES: [{
		name: 'admin_id',
		type: 'objectid'
	}, {
		name: 'recurlySubscription_id',
		type: 'string'
	}, {
		name: 'planCode',
		type: 'string'
	}, {
		name: 'membersLimit'
		type: 'number'
	}, {
		name: 'groupPlan'
		type: 'boolean'
	}, {
		name: 'customAccount'
		type: 'boolean'
	}]

	show: (req, res, next)->
		# The user_id isn't used in the look up, it just provides a nice
		# breadcrumb trail of where we came from for navigation
		{subscription_id, user_id} = req.params
		logger.log {subscription_id}, "getting admin request for subscription"
		SubscriptionLocator.getSubscription subscription_id, (err, subscription) ->
			return next(err) if err?
			if !subscription?
				return ErrorController.notFound req, res
			res.render Path.resolve(__dirname, "../views/subscription/show"), {subscription, user_id}

	update: (req, res, next) ->
		{subscription_id, user_id} = req.params
		{valid, update} = UserController._reqToMongoUpdate(req, SubscriptionController.ATTRIBUTES)
		if !valid
			return res.sendStatus 400
		logger.log {subscription_id, update}, "updating subscription via admin panel"
		Subscription.update {_id: ObjectId(subscription_id)}, { $set: update }, (error) ->
			return next(error) if error?
			res.sendStatus 204

	new: (req, res, next) ->
		res.render Path.resolve(__dirname, "../views/subscription/new"), {admin_id: req.params.user_id}

	create: (req, res, next) ->
		{valid, update} = UserController._reqToMongoUpdate(req, SubscriptionController.ATTRIBUTES)
		if !valid
			return res.sendStatus 400
		logger.log {update}, "creating subscription via admin panel"
		new Subscription(update).save (error, subscription) ->
			return next(error) if error?
			res.json {subscription}

	delete: (req, res)->
		subscription_id = req.params.subscription_id
		logger.log subscription_id: subscription_id, "received admin request to delete subscription"
		SubscriptionLocator.getSubscription subscription_id, (err, subscription) ->
			return next(err) if err?
			affected_user_ids = [subscription.admin_id].concat(subscription.member_ids or [])
			logger.log {subscription_id, affected_user_ids}, "deleting subscription and downgrading users"
			Subscription.remove {_id: ObjectId(subscription_id)}, (err) ->
				return next(err) if err?
				async.mapSeries affected_user_ids, SubscriptionUpdater._setUsersMinimumFeatures, (err) ->
					return next(err) if err?
					res.sendStatus 204
