sinon = require('sinon')
chai = require('chai')
should = chai.should()
expect = chai.expect
modulePath = "../../../app/js/SubscriptionController.js"
SandboxedModule = require('sandboxed-module')
events = require "events"
ObjectId = require("mongojs").ObjectId
assert = require("assert")
Path = require "path"

describe "SubscriptionController", ->
	beforeEach ->
		@SubscriptionController = SandboxedModule.require modulePath, requires:
			"logger-sharelatex":
				log:->
				err:->
			"./UserController": @UserController = {}
			"../../../../app/js/Features/Subscription/SubscriptionLocator": @SubscriptionLocator = {}
			"../../../../app/js/Features/Subscription/SubscriptionUpdater": @SubscriptionUpdater = {}
			"../../../../app/js/models/Subscription": Subscription: @Subscription =
				class Subscription
					constructor: sinon.stub()
					save: sinon.stub().yields()
					@remove: sinon.stub().yields()
					@update: sinon.stub().yields()
			"../../../../app/js/Features/Errors/ErrorController": @ErrorController = {}
			"../../../../app/js/infrastructure/mongojs":
				db: @db =
					projects: {}
					users: {}
				ObjectId: ObjectId
			"metrics-sharelatex":
				gauge:->
		
		@res =
			render: sinon.stub()
			json: sinon.stub()
			sendStatus: sinon.stub()
		
		@req = {}
			
		@ErrorController.notFound = sinon.stub()
		
		@subscription_id = ObjectId().toString()
		@user_id = ObjectId().toString()

	describe "show", ->
		beforeEach ->
			@SubscriptionLocator.getSubscription = sinon.stub()
			@req.params = {@subscription_id, @user_id}
		
		describe "successfully", ->
			beforeEach ->
				@SubscriptionLocator.getSubscription.yields(null, @subscription = {"mock": "subscription"})
				@SubscriptionController.show @req, @res
			
			it "should look up the subscription", ->
				@SubscriptionLocator.getSubscription
					.calledWith(@subscription_id)
					.should.equal true
			
			it "should render the subscription page", ->
				@res.render
					.calledWith(Path.resolve(__dirname, "../../../app/views/subscription/show"), {@subscription, @user_id})
					.should.equal true
		
		describe "when subscription is not found", ->
			beforeEach ->
				@SubscriptionLocator.getSubscription.yields(null, null)
				@SubscriptionController.show @req, @res
			
			it "should render the 404 page", ->
				@ErrorController.notFound
					.calledWith(@req, @res)
					.should.equal true

	describe "update", ->
		beforeEach ->
			@req.params = {@subscription_id}
			@req.body = {
				"mock": "data for subscription"
			}
		
		describe "successfully", ->
			beforeEach ->
				@UserController._reqToMongoUpdate = sinon.stub().returns({valid: true, update: @update = {"mock": "update"}})
				@SubscriptionController.update @req, @res
			
			it "should convert the body params to an update", ->
				@UserController._reqToMongoUpdate
					.calledWith(@req, @SubscriptionController.ATTRIBUTES)
					.should.equal true
			
			it "should update the subscription", ->
				@Subscription.update
					.calledWith({_id: ObjectId(@subscription_id)}, { $set: @update })
					.should.equal true
			
			it "should return 204", ->
				@res.sendStatus
					.calledWith(204)
					.should.equal true
		
		describe "when params are not valid", ->
			beforeEach ->
				@UserController._reqToMongoUpdate = sinon.stub().returns({valid: false})
				@SubscriptionController.update @req, @res

			it "should not update the subscription", ->
				@Subscription.update.called.should.equal false
			
			it "should return 400", ->
				@res.sendStatus
					.calledWith(400)
					.should.equal true

	describe "create", ->
		beforeEach ->
			@req.body = {
				"mock": "data for subscription"
			}
			@Subscription::save.yields(null, @new_subscription = {"new": "subscription"})
		
		describe "successfully", ->
			beforeEach ->
				@UserController._reqToMongoUpdate = sinon.stub().returns({valid: true, update: @update = {"mock": "update"}})
				@SubscriptionController.create @req, @res
			
			it "should convert the body params to an update", ->
				@UserController._reqToMongoUpdate
					.calledWith(@req, @SubscriptionController.ATTRIBUTES)
					.should.equal true
			
			it "should create the subscription", ->
				# @Subscription::constructor.calledWith(@update).should.equal true
				@Subscription::save.called.should.equal true
			
			it "should return the subscription as json", ->
				@res.json
					.calledWith({subscription: @new_subscription})
					.should.equal true
		
		describe "when params are not valid", ->
			beforeEach ->
				@UserController._reqToMongoUpdate = sinon.stub().returns({valid: false})
				@SubscriptionController.create @req, @res

			it "should not save the subscription", ->
				@Subscription::save.called.should.equal false
			
			it "should return 400", ->
				@res.sendStatus
					.calledWith(400)
					.should.equal true

	describe "delete", ->
		beforeEach ->
			@subscription = {
				"mock": "subscription",
				admin_id: ObjectId(),
				member_ids: [ ObjectId(), ObjectId(), ObjectId() ]
			}
			@SubscriptionLocator.getSubscription = sinon.stub().yields(null, @subscription)
			@SubscriptionUpdater._setUsersMinimumFeatures = sinon.stub().yields()
			@req.params = {@subscription_id}
			@SubscriptionController.delete @req, @res
			
		it "should look up the subscription", ->
			@SubscriptionLocator.getSubscription
				.calledWith(@subscription_id)
				.should.equal true
		
		it "should remove the subscription", ->
			@Subscription.remove
				.calledWith({_id: ObjectId(@subscription_id)})
				.should.equal true
		
		it "should downgrade the admin_id", ->
			@SubscriptionUpdater._setUsersMinimumFeatures
				.calledWith(@subscription.admin_id)
				.should.equal true
		
		it "should downgrade all of the members", ->
			for user_id in @subscription.member_ids
				@SubscriptionUpdater._setUsersMinimumFeatures
					.calledWith(user_id)
					.should.equal true
			