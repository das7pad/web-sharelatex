should = require('chai').should()
SandboxedModule = require('sandboxed-module')
assert = require('assert')
path = require('path')
modulePath = path.join __dirname, '../../../../app/js/Authentication/OverleafAuthenticationManager'
sinon = require("sinon")
expect = require("chai").expect

describe "OverleafAuthenticationManager", ->
	beforeEach ->
		@OverleafAuthenticationManager = SandboxedModule.require modulePath, requires:
			"../../../../../app/js/Features/User/UserCreator": @UserCreator = {}
			"../../../../../app/js/models/User": User: @User = {}
			"../OverleafUsers/UserMapper": @UserMapper = {}
			"logger-sharelatex": { log: sinon.stub() }
			"settings-sharelatex":
				overleaf:
					host: @host = "http://overleaf.example.com"
				apis:
					v1:
						url: "http://overleaf.example.com"
			"request": @request = {}
			"../../../../../app/js/Features/Subscription/FeaturesUpdater":
				@FeaturesUpdater = {refreshFeatures: sinon.stub()}

		@accessToken = "mock-access-token"
		@refreshToken = "mock-refresh-token"
		@callback = sinon.stub()

	describe "getUserProfile", ->
		describe "successfully", ->
			beforeEach ->
				@request.get = sinon.stub().yields(null, { statusCode: 204 }, @profile = {"mock": "profile"})
				@OverleafAuthenticationManager.getUserProfile @accessToken, @callback

			it "should make an authenticated request to overleaf", ->
				@request.get
					.calledWith({
						url: "#{@host}/api/v1/sharelatex/users/current_user/profile"
						json: true
						headers:
							"Authorization": "Bearer #{@accessToken}"
					})
					.should.equal true

			it "should return the user profile", ->
				@callback.calledWith(null, @profile).should.equal true

		describe "with a failed request", ->
			beforeEach ->
				@request.get = sinon.stub().yields(null, { statusCode: 404 }, null)
				@OverleafAuthenticationManager.getUserProfile @accessToken, @callback

			it "should return an error", ->
				@callback.called.should.equal true
				error = @callback.args[0][0]
				error.message.should.equal "non-success code from overleaf: 404"

	describe "setupOAuthUser", ->
		beforeEach ->
			@User.findOne = sinon.stub()
			@user =
				_id: "mock-user-id"
				overleaf: {}
				save: sinon.stub().yields()
			@UserMapper.createSlUser = sinon.stub().yields(null, @user)
			@profile =
				id: "mock-overleaf-id"
				email: "Joe@Example.com"
			@UserMapper.getCanonicalEmail = sinon.stub().withArgs("Joe@Example.com").returns("joe@example.com")

		describe "with no OL or SL user in the system", ->
			beforeEach ->
				@User.findOne.yields(null, null)
				@OverleafAuthenticationManager.setupOAuthUser(@accessToken, @refreshToken, @profile, @callback)

			it "should create a user", ->
				@UserMapper.createSlUser
					.calledWith(@profile)
					.should.equal true

			it "should return the user", ->
				@callback.calledWith(null, @user).should.equal true

		describe "with an existing user for this OL account", ->
			beforeEach ->
				@User.findOne.withArgs("overleaf.id": @profile.id).yields(null, @user)
				@OverleafAuthenticationManager.setupOAuthUser(@accessToken, @refreshToken, @profile, @callback)

			it "should return the user", ->
				@callback.calledWith(null, @user).should.equal true

		describe "with a conflicting email in SL", ->
			beforeEach ->
				@User.findOne.withArgs("overleaf.id": @profile.id).yields(null, null)
				@User.findOne.withArgs("email": "joe@example.com").yields(null, @user)
				@OverleafAuthenticationManager.setupOAuthUser(@accessToken, @refreshToken, @profile, @callback)

			it "should not create a new user", ->
				@UserMapper.createSlUser.called.should.equal false

			it "should return a the user data for confirmation with SL", ->
				@callback
					.calledWith(null, null, {
						email_exists_in_sl: true
						@profile,
						user_id: @user._id
					})
					.should.equal true
