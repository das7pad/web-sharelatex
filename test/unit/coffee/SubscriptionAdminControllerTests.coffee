sinon = require('sinon')
chai = require('chai')
should = chai.should()
expect = chai.expect
modulePath = "../../../app/js/SubscriptionAdminController.js"
SandboxedModule = require('sandboxed-module')
events = require "events"
ObjectId = require("mongojs").ObjectId
assert = require("assert")
Path = require "path"

describe "SubscriptionAdminController", ->
	beforeEach ->
		@SubscriptionAdminController = SandboxedModule.require modulePath, requires:
			"logger-sharelatex":
				log:->
				err:->
			"./UserAdminController": @UserAdminController = {}
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
			@db.users.find = sinon.stub()
			@req.params = {@subscription_id, @user_id}
		
		describe "successfully", ->
			beforeEach ->
				@subscription = {
					"mock": "subscription"
					member_ids: [ ObjectId(), ObjectId(), ObjectId() ]
				}
				@members = [{"mock": "member2"}, {"mock": "member2"}, {"mock": "member3"}]
				@db.users.find.yields(null, @members)
				@SubscriptionLocator.getSubscription.yields(null, @subscription)
				@SubscriptionAdminController.show @req, @res
			
			it "should look up the subscription", ->
				@SubscriptionLocator.getSubscription
					.calledWith(@subscription_id)
					.should.equal true
			
			it "should look up the member_ids", ->
				@db.users.find
					.calledWith({_id: { $in: @subscription.member_ids }}, { email: 1 })
					.should.equal true
			
			it "should render the subscription page", ->
				@res.render
					.calledWith(Path.resolve(__dirname, "../../../app/views/subscription/show"), {@subscription, @user_id, @members})
					.should.equal true
		
		describe "when subscription is not found", ->
			beforeEach ->
				@SubscriptionLocator.getSubscription.yields(null, null)
				@SubscriptionAdminController.show @req, @res
			
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
				@UserAdminController._reqToMongoUpdate = sinon.stub().returns(@update = {"mock": "update"})
				@SubscriptionAdminController.update @req, @res
			
			it "should convert the body params to an update", ->
				@UserAdminController._reqToMongoUpdate
					.calledWith(@req.body, @SubscriptionAdminController.ALLOWED_ATTRIBUTES)
					.should.equal true
			
			it "should update the subscription", ->
				@Subscription.update
					.calledWith({_id: ObjectId(@subscription_id)}, { $set: @update })
					.should.equal true
			
			it "should return 204", ->
				@res.sendStatus
					.calledWith(204)
					.should.equal true

	describe "create", ->
		beforeEach ->
			@req.body = {
				"mock": "data for subscription"
			}
			@Subscription::save.yields(null, @new_subscription = {"new": "subscription"})
		
		describe "successfully", ->
			beforeEach ->
				@UserAdminController._reqToMongoUpdate = sinon.stub().returns({valid: true, update: @update = {"mock": "update"}})
				@SubscriptionAdminController.create @req, @res
			
			it "should convert the body params to an update", ->
				@UserAdminController._reqToMongoUpdate
					.calledWith(@req.body, @SubscriptionAdminController.ALLOWED_ATTRIBUTES)
					.should.equal true
			
			it "should create the subscription", ->
				# @Subscription::constructor.calledWith(@update).should.equal true
				@Subscription::save.called.should.equal true
			
			it "should return the subscription as json", ->
				@res.json
					.calledWith({subscription: @new_subscription})
					.should.equal true

	describe "delete", ->
		beforeEach ->
			@SubscriptionUpdater.deleteSubscription = sinon.stub().yields()
			@req.params = {@subscription_id}
			@SubscriptionAdminController.delete @req, @res
		
		it "should remove the subscription", ->
			@SubscriptionUpdater.deleteSubscription
				.calledWith(@subscription_id)
				.should.equal true
			