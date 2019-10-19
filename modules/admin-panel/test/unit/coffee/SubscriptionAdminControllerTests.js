/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const sinon = require('sinon');
const chai = require('chai');
const should = chai.should();
const {
    expect
} = chai;
const modulePath = "../../../app/js/SubscriptionAdminController.js";
const SandboxedModule = require('sandboxed-module');
const events = require("events");
const {
    ObjectId
} = require("mongojs");
const assert = require("assert");
const Path = require("path");

describe("SubscriptionAdminController", function() {
	beforeEach(function() {
		let Subscription;
		this.SubscriptionAdminController = SandboxedModule.require(modulePath, { requires: {
			"logger-sharelatex": {
				log() {},
				err() {}
			},
			"./UserAdminController": (this.UserAdminController = {}),
			"../../../../app/js/Features/User/UserGetter": (this.UserGetter = {}),
			"../../../../app/js/Features/Subscription/SubscriptionLocator": (this.SubscriptionLocator = {}),
			"../../../../app/js/Features/Subscription/SubscriptionUpdater": (this.SubscriptionUpdater = {}),
			"../../../../app/js/Features/Subscription/FeaturesUpdater":
				(this.FeaturesUpdater = {refreshFeatures: sinon.stub().yields()}),
			"../../../../app/js/models/Subscription": { Subscription: (this.Subscription =
				(Subscription = (function() {
					let createSubscription = undefined;
					Subscription = class Subscription {
						static initClass() {
							this.prototype.save = sinon.stub().yields();
							this.remove = sinon.stub().yields();
							this.findAndModify = sinon.stub().yields();
							createSubscription = sinon.stub();
						}
						constructor() {
							return createSubscription.apply(this, arguments);
						}
					};
					Subscription.initClass();
					return Subscription;
				})()))
		},
			"../../../../app/js/Features/Errors/ErrorController": (this.ErrorController = {}),
			"metrics-sharelatex": {
				gauge() {}
			}
		}
	}
		);

		this.res = {
			render: sinon.stub(),
			json: sinon.stub(),
			sendStatus: sinon.stub()
		};

		this.req = {};

		this.ErrorController.notFound = sinon.stub();

		this.subscription_id = ObjectId().toString();
		return this.user_id = ObjectId().toString();
	});

	describe("show", function() {
		beforeEach(function() {
			this.SubscriptionLocator.getSubscription = sinon.stub();
			this.UserGetter.getUsers = sinon.stub();
			return this.req.params = {subscription_id: this.subscription_id, user_id: this.user_id};});

		describe("successfully", function() {
			beforeEach(function() {
				this.subscription = {
					"mock": "subscription",
					member_ids: [ ObjectId(), ObjectId(), ObjectId() ]
				};
				this.members = (this.managers = [{"mock": "member2"}, {"mock": "member2"}, {"mock": "member3"}]);
				this.UserGetter.getUsers.yields(null, this.members);
				this.SubscriptionLocator.getSubscription.yields(null, this.subscription);
				return this.SubscriptionAdminController.show(this.req, this.res);
			});

			it("should look up the subscription", function() {
				return this.SubscriptionLocator.getSubscription
					.calledWith(this.subscription_id)
					.should.equal(true);
			});

			it("should look up the member_ids", function() {
				return this.UserGetter.getUsers
					.calledWith(this.subscription.member_ids, { email: 1 })
					.should.equal(true);
			});

			return it("should render the subscription page", function() {
				return this.res.render
					.calledWith(Path.resolve(__dirname, "../../../app/views/subscription/show"),
					{subscription: this.subscription, user_id: this.user_id, members: this.members, managers: this.managers})
					.should.equal(true);
			});
		});

		return describe("when subscription is not found", function() {
			beforeEach(function() {
				this.SubscriptionLocator.getSubscription.yields(null, null);
				return this.SubscriptionAdminController.show(this.req, this.res);
			});

			return it("should render the 404 page", function() {
				return this.ErrorController.notFound
					.calledWith(this.req, this.res)
					.should.equal(true);
			});
		});
	});

	describe("update", function() {
		beforeEach(function() {
			this.req.params = {subscription_id: this.subscription_id};
			return this.req.body = {
				"mock": "data for subscription"
			};});

		return describe("successfully", function() {
			beforeEach(function() {
				this.subscription = {
					"mock": "subscription",
					"admin_id": "admin-id",
					"member_ids": ["member-id-1", "member-id-2"]
				};
				this.Subscription.findAndModify.yields(null, this.subscription);
				this.UserAdminController._reqToMongoUpdate = sinon.stub().returns(this.update = {"mock": "update"});
				return this.SubscriptionAdminController.update(this.req, this.res);
			});

			it("should convert the body params to an update", function() {
				return this.UserAdminController._reqToMongoUpdate
					.calledWith(this.req.body, this.SubscriptionAdminController.ALLOWED_ATTRIBUTES)
					.should.equal(true);
			});

			it("should update the subscription", function() {
				return this.Subscription.findAndModify
					.calledWith({_id: this.subscription_id}, { $set: this.update })
					.should.equal(true);
			});

			it("should refresh features", function() {
				return this.FeaturesUpdater.refreshFeatures
					.callCount
					.should.equal(3);
			});

			it("should refresh features for admin", function() {
				return this.FeaturesUpdater.refreshFeatures
					.calledWith('admin-id')
					.should.equal(true);
			});

			it("should refresh features for members", function() {
				this.FeaturesUpdater.refreshFeatures
					.calledWith('member-id-1')
					.should.equal(true);
				return this.FeaturesUpdater.refreshFeatures
					.calledWith('member-id-2')
					.should.equal(true);
			});

			return it("should return 204", function() {
				return this.res.sendStatus
					.calledWith(204)
					.should.equal(true);
			});
		});
	});

	describe("create", function() {
		beforeEach(function() {
			this.req.body = {
				"mock": "data for subscription",
				admin_id: (this.admin_id = 'mock-admin-id')
			};
			return this.Subscription.prototype.save.yields(null, (this.new_subscription = {"new": "subscription"}));
		});

		return describe("successfully", function() {
			beforeEach(function() {
				this.UserAdminController._reqToMongoUpdate = sinon.stub().returns(this.update = {"mock": "update"});
				return this.SubscriptionAdminController.create(this.req, this.res);
			});

			it("should convert the body params to an update", function() {
				return this.UserAdminController._reqToMongoUpdate
					.calledWith(this.req.body, this.SubscriptionAdminController.ALLOWED_ATTRIBUTES)
					.should.equal(true);
			});

			it("should create the subscription", function() {
				// @Subscription::constructor.calledWith(@update).should.equal true
				return this.Subscription.prototype.save.called.should.equal(true);
			});

			it("should add the admin_id and manager_ids to the update", function() {
				expect(this.update.admin_id).to.equal(this.admin_id);
				return expect(this.update.manager_ids).to.deep.equal([this.admin_id]);
		});

			return it("should return the subscription as json", function() {
				return this.res.json
					.calledWith({subscription: this.new_subscription})
					.should.equal(true);
			});
		});
	});

	return describe("delete", function() {
		beforeEach(function() {
			this.SubscriptionUpdater.deleteSubscription = sinon.stub().yields();
			this.req.params = {subscription_id: this.subscription_id};
			return this.SubscriptionAdminController.delete(this.req, this.res);
		});

		return it("should remove the subscription", function() {
			return this.SubscriptionUpdater.deleteSubscription
				.calledWith(this.subscription_id)
				.should.equal(true);
		});
	});
});
