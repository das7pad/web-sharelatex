expect = require("chai").expect
UserClient = require "../../../../../test/acceptance/js/helpers/User"
request = require "../../../../../test/acceptance/js/helpers/request"
{ObjectId} = require("../../../../../app/js/infrastructure/mongojs")
Subscription = require("../../../../../app/js/models/Subscription").Subscription
User = require("../../../../../app/js/models/User").User
settings = require 'settings-sharelatex'

getV2PlanCode = (v1_user_id, callback = (planCode, statusCode) ->) ->
	request {
		method: 'GET',
		url: "/overleaf/user/#{v1_user_id}/plan_code",
		json: true,
		auth:
			user: 'sharelatex'
			pass: 'password'
			sendImmediately: true
	}, (error, response, body) ->
		throw error if error?
		callback body?.plan_code, response.statusCode

getV2SubscriptionStatus = (v1_user_id, callback = (planCode, statusCode) ->) ->
	request {
		method: 'GET',
		url: "/overleaf/user/#{v1_user_id}/subscription",
		json: true,
		auth:
			user: 'sharelatex'
			pass: 'password'
			sendImmediately: true
	}, (error, response, body) ->
		throw error if error?
		callback body, response.statusCode

V1_ID = 42

describe "AccountSync", ->
	beforeEach (done) ->
		@user = new UserClient()
		@user.ensureUserExists (error) =>
			throw error if error?
			@user.overleaf = id: V1_ID++
			User.update { _id: @user._id }, { 'overleaf.id': @user.overleaf.id }, done

	describe "getV2PlanCode", ->
		describe "when the user id is not in v2", ->
			it "should return 404", (done) ->
				getV2PlanCode 9999, (planCode, statusCode) ->
					expect(statusCode).to.equal 404
					done()

		describe "when user's v1 id exists in v2", ->
			describe "when user has no subscriptions", ->
				it "should return 'personal'", (done) ->
					getV2PlanCode @user.overleaf.id, (planCode, statusCode) ->
						expect(statusCode).to.equal 200
						expect(planCode).to.equal 'personal'
						done()

			describe "when the user has an individual subscription", ->
				beforeEach ->
					Subscription.create {
						admin_id: @user._id
						manager_ids: [@user._id]
						planCode: 'collaborator_annual'
						customAccount: true
					} # returns a promise

				it "should return the canonical plan code", (done) ->
					getV2PlanCode @user.overleaf.id, (planCode, statusCode) ->
						expect(statusCode).to.equal 200
						expect(planCode).to.equal 'collaborator'
						done()

			describe "when the user is in a group subscription", ->
				beforeEach ->
					adminId = ObjectId()
					Subscription.create {
						admin_id: adminId
						manager_ids: [adminId]
						member_ids: [@user._id]
						groupAccount: true
						planCode: 'professional_annual'
						customAccount: true
					} # returns a promise

				it "should return the canonical plan code", (done) ->
					getV2PlanCode @user.overleaf.id, (planCode, statusCode) ->
						expect(statusCode).to.equal 200
						expect(planCode).to.equal 'professional'
						done()

			describe "when the user has a group and personal subscription", ->
				beforeEach (done) ->
					Subscription.create {
						admin_id: @user._id
						manager_ids: [@user._id]
						planCode: 'professional_annual'
						customAccount: true
					}, (error) =>
						throw error if error?
						adminId = ObjectId()
						Subscription.create {
							admin_id: adminId
							manager_ids: [adminId]
							member_ids: [@user._id]
							groupAccount: true
							planCode: 'collaborator'
							customAccount: true
						}, done
					return

				it "should return the best plan code", (done) ->
					getV2PlanCode @user.overleaf.id, (planCode, statusCode) ->
						expect(statusCode).to.equal 200
						expect(planCode).to.equal 'professional'
						done()

	describe "getV2SubscriptionStatus", ->
		describe "when the user id is not in v2", ->
			it "should return 404", (done) ->
				getV2SubscriptionStatus 9999, (status, statusCode) ->
					expect(statusCode).to.equal 404
					done()

		describe "when user's v1 id exists in v2", ->
			describe "when user has no subscriptions", ->
				it "should return has_subscription: false, in_team: false", (done) ->
					getV2SubscriptionStatus @user.overleaf.id, (status, statusCode) ->
						expect(statusCode).to.equal 200
						expect(status).to.deep.equal {
							has_subscription: false,
							in_team: false
						}
						done()

			describe "when the user has an individual subscription", ->
				beforeEach ->
					Subscription.create {
						admin_id: @user._id
						manager_ids: [@user._id]
						planCode: 'collaborator_annual'
						customAccount: true
					} # returns a promise

				it "should return has_subscription: true, in_team: false", (done) ->
					getV2SubscriptionStatus @user.overleaf.id, (status, statusCode) ->
						expect(statusCode).to.equal 200
						expect(status).to.deep.equal {
							has_subscription: true,
							in_team: false
						}
						done()

			describe "when the user is in a group subscription", ->
				beforeEach ->
					adminId = ObjectId()
					Subscription.create {
						admin_id: adminId
						manager_ids: [adminId]
						member_ids: [@user._id]
						groupAccount: true
						planCode: 'professional_annual'
						customAccount: true
					} # returns a promise

				it "should return has_subscription: false, in_team: true", (done) ->
					getV2SubscriptionStatus @user.overleaf.id, (status, statusCode) ->
						expect(statusCode).to.equal 200
						expect(status).to.deep.equal {
							has_subscription: false,
							in_team: true
						}
						done()

			describe "when the user has a group and personal subscription", ->
				beforeEach (done) ->
					Subscription.create {
						admin_id: @user._id
						manager_ids: [@user._id]
						planCode: 'professional_annual'
						customAccount: true
					}, (error) =>
						throw error if error?
						adminId = ObjectId()
						Subscription.create {
							admin_id: adminId
							manager_ids: [adminId]
							member_ids: [@user._id]
							groupAccount: true
							planCode: 'collaborator'
							customAccount: true
						}, done
					return

				it "should return has_subscription: true, in_team: true", (done) ->
					getV2SubscriptionStatus @user.overleaf.id, (status, statusCode) ->
						expect(statusCode).to.equal 200
						expect(status).to.deep.equal {
							has_subscription: true,
							in_team: true
						}
						done()
