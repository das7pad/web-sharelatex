should = require('chai').should()
SandboxedModule = require('sandboxed-module')
assert = require('assert')
path = require('path')
modulePath = path.join __dirname, '../../../../app/js/OverleafUsers/UserMapper'
sinon = require("sinon")
expect = require("chai").expect

describe "UserMapper", ->
	beforeEach ->
		@UserMapper = SandboxedModule.require modulePath, requires:
			"../../../../../app/js/Features/User/UserCreator": @UserCreator = {}
			"../../../../../app/js/models/User": User: @User = {}
			"../../../../../app/js/models/UserStub": UserStub: @UserStub = {}
			"../../../../../app/js/Features/Subscription/SubscriptionGroupHandler": @SubscriptionGroupHandler = {}
			"../../../../../app/js/Features/Collaborators/CollaboratorsHandler": @CollaboratorsHandler = {}
		@callback = sinon.stub()

	describe "getSlIdFromOlUser", ->
		beforeEach ->
			@ol_user =
				id: "mock-overleaf-id"
				email: "jane@example.com"
			@User.findOne = sinon.stub()

		describe "when a user exists already", ->
			beforeEach ->
				@User.findOne.yields(null, @user = { _id: "mock_user_id" })
				@UserMapper.getSlIdFromOlUser @ol_user, @callback

			it "should look up the user by overleaf id", ->
				@User.findOne
					.calledWith({
						"overleaf.id": @ol_user.id
					})
					.should.equal true

			it "should return the user_id", ->
				@callback.calledWith(null, @user._id).should.equal true

		describe "when no user exists", ->
			beforeEach ->
				@User.findOne.yields(null, null)
				@UserStub.update = sinon.stub().yields()
				@UserStub.findOne = sinon.stub().yields(null, @user_stub = { _id: "mock-user-stub-id" })
				@UserMapper.getSlIdFromOlUser @ol_user, @callback

			it "should look up the user by overleaf id", ->
				@User.findOne
					.calledWith({
						"overleaf.id": @ol_user.id
					})
					.should.equal true

			it "should ensure the UserStub exists", ->
				@UserStub.update
					.calledWith({
						"overleaf.id": @ol_user.id
					}, {
						email: @ol_user.email
					}, {
						upsert: true
					})
					.should.equal true

			it "should return the user_id", ->
				@callback.calledWith(null, @user_stub._id).should.equal true

	describe "createSlUser", ->
		beforeEach ->
			@ol_user = {
				id: 42
				email: "jane@example.com"
			}
			@accessToken = "mock-access-token"
			@refreshToken = "mock-refresh-token"
			@UserMapper.getOlUserStub = sinon.stub()
			@UserMapper.removeOlUserStub = sinon.stub().yields()
			@UserCreator.createNewUser = sinon.stub().yields(null, @user = {"mock": "user"})

		describe "when a UserStub exists", ->
			beforeEach ->
				@UserMapper.getOlUserStub.yields(null, @user_stub = { _id: "user-stub-id" })
				@UserMapper.createSlUser @ol_user, @accessToken, @refreshToken, @callback

			it "should look up the user stub", ->
				@UserMapper.getOlUserStub
					.calledWith(@ol_user.id)
					.should.equal true

			it "should create a new user with the same _id", ->
				@UserCreator.createNewUser
					.calledWith({
						_id: @user_stub._id
						email: @ol_user.email
						overleaf: {
							id: @ol_user.id
							accessToken: @accessToken
							refreshToken: @refreshToken
						}
						ace:
							theme: 'overleaf'
					})
					.should.equal true

			it "should remove the user stub", ->
				@UserMapper.removeOlUserStub
					.calledWith(@ol_user.id)
					.should.equal true

			it "should return the user", ->
				@callback.calledWith(null, @user).should.equal true

		describe "when no UserStub exists", ->
			beforeEach ->
				@UserMapper.getOlUserStub.yields()
				@UserMapper.createSlUser @ol_user, @accessToken, @refreshToken, @callback

			it "should create a new user without specifying an id", ->
				@UserCreator.createNewUser
					.calledWith({
						email: @ol_user.email
						overleaf: {
							id: @ol_user.id
							accessToken: @accessToken
							refreshToken: @refreshToken
						}
						ace:
							theme: 'overleaf'
					})
					.should.equal true

			it "should return the user", ->
				@callback.calledWith(null, @user).should.equal true

	describe 'mergeWithSlUser', ->
		beforeEach ->
			@user_id = "mock-user-id"
			@sl_user =
				email: "jane@example.com"
				save: sinon.stub().yields()
			@ol_user = {
				id: 42
				email: "Jane@Example.com" # Only needs to match up to case
			}
			@accessToken = "mock-access-token"
			@refreshToken = "mock-refresh-token"
			@UserMapper.getOlUserStub = sinon.stub().yields()
			@UserMapper.removeOlUserStub = sinon.stub().yields()
			@CollaboratorsHandler.transferProjects = sinon.stub().yields()
			@User.findOne = sinon.stub().yields(null, @sl_user)

		describe "successfully - without an existing UserStub", ->
			beforeEach ->
				@UserMapper.mergeWithSlUser(
					@user_id, @ol_user, @accessToken, @refreshToken, @callback
				)

			it "should look up whether there is a UserStub", ->
				@UserMapper.getOlUserStub
					.calledWith(@ol_user.id)
					.should.equal true

			it "should look up the user from the SL user_id", ->
				@User.findOne
					.calledWith({_id: @user_id})
					.should.equal true

			it "should add the overleaf properties to the user", ->
				expect(@sl_user.overleaf).to.deep.equal {
					id: @ol_user.id
					accessToken: @accessToken
					refreshToken: @refreshToken
				}

			it "should save the user", ->
				@sl_user.save.called.should.equal true

			it "should not try to remove any UserStub", ->
				@UserMapper.removeOlUserStub.called.should.equal false

			it "should not try to transfer any projects", ->
				@CollaboratorsHandler.transferProjects.called.should.equal false

			it "should return the user", ->
				@callback.calledWith(null, @sl_user).should.equal true

		describe "successfully - with an existing UserStub", ->
			beforeEach ->
				@UserMapper.getOlUserStub = sinon.stub().yields(null, @user_stub = { _id: "user-stub-id" })
				@SubscriptionGroupHandler.replaceUserReferencesInGroups = sinon.stub().yields(null)
				@UserMapper.mergeWithSlUser(
					@user_id, @ol_user, @accessToken, @refreshToken, @callback
				)

			it "should remove the user stub", ->
				@UserMapper.removeOlUserStub
					.calledWith(@ol_user.id)
					.should.equal true

			it "should transfer projects from the user stub to the user", ->
				@CollaboratorsHandler.transferProjects
					.calledWith(@user_stub._id, @user_id)
					.should.equal true

			it "should transfer group memmberships from the user stub to the user", ->
				@SubscriptionGroupHandler.replaceUserReferencesInGroups
					.calledWith(@user_stub._id, @user_id)
					.should.equal true

			it "should return the user", ->
				@callback.calledWith(null, @sl_user).should.equal true

		describe "when emails don't match", ->
			beforeEach ->
				@ol_user.email = "different@example.com"
				@UserMapper.mergeWithSlUser(
					@user_id, @ol_user, @accessToken, @refreshToken, @callback
				)

			it "should not save the user", ->
				@sl_user.save.called.should.equal false

			it "should return the callback with an error", ->
				@callback.calledWith(new Error('expected OL and SL account emails to match'))
