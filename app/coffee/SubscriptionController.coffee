logger = require "logger-sharelatex"
metrics = require "metrics-sharelatex"
_ = require "underscore"
Path = require("path")
UserController = require("./UserController")
SubscriptionLocator = require("../../../../app/js/Features/Subscription/SubscriptionLocator")
Subscription = require("../../../../app/js/models/Subscription").Subscription

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
		{subscription_id, user_id} = req.params
		logger.log {subscription_id}, "getting admin request for subscription"
		SubscriptionLocator.getSubscription subscription_id, (err, subscription) ->
			return next(err) if err?
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

	# delete: (req, res)->
	# 	user_id = req.params.user_id
	# 	logger.log user_id: user_id, "received admin request to delete user"
	# 	UserDeleter.deleteUser user_id, (err)->
	# 		if err?
	# 			res.sendStatus 500
	# 		else
	# 			res.sendStatus 200
	# 

