should = require('chai').should()
SandboxedModule = require('sandboxed-module')
assert = require('assert')
path = require('path')
modulePath = path.join __dirname, '../../../app/js/OverleafAuthenticationManager'
sinon = require("sinon")
expect = require("chai").expect

describe "OverleafAuthenticationManager", ->
	beforeEach ->
		@OverleafAuthenticationManager = SandboxedModule.require modulePath, requires:
			"../../../../app/js/Features/User/UserCreator": @UserCreator = {}
			"../../../../app/js/models/User": User: @User = {}
			"logger-sharelatex": { log: sinon.stub() }
			"settings-sharelatex":
				overleaf_oauth:
					host: @host = "http://overleaf.example.com"
			"request": @request = {}

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

	describe "setupUser", ->
		beforeEach ->
			@User.findOne = sinon.stub()
			@user =
				overleaf: {}
				save: sinon.stub().yields()
			@UserCreator.createNewUser = sinon.stub().yields(null, @user)
			@profile =
				id: "mock-overleaf-id"
				email: "joe@example.com"

		describe "with no OL or SL user in the system", ->
			beforeEach ->
				@User.findOne.yields(null, null)
				@OverleafAuthenticationManager.setupUser(@accessToken, @refreshToken, @profile, @callback)

			it "should create a user", ->
				@UserCreator.createNewUser
					.calledWith({
						overleaf:
							id: @profile.id
							accessToken: @accessToken
							refreshToken: @refreshToken
						email: @profile.email
					})
					.should.equal true

			it "should return the user", ->
				@callback.calledWith(null, @user).should.equal true
			
		describe "with an existing user for this OL account", ->
			beforeEach ->
				@User.findOne.withArgs("overleaf.id": @profile.id).yields(null, @user)
				@OverleafAuthenticationManager.setupUser(@accessToken, @refreshToken, @profile, @callback)

			it "should refresh the tokens on the user", ->
				@user.overleaf.refreshToken.should.equal @refreshToken
				@user.overleaf.accessToken.should.equal @accessToken
				@user.save.called.should.equal true
			
			it "should return the user", ->
				@callback.calledWith(null, @user).should.equal true
		
		describe "with a conflicting email in SL", ->
			beforeEach ->
				@User.findOne.withArgs("overleaf.id": @profile.id).yields(null, null)
				@User.findOne.withArgs("email": @profile.email).yields(null, @user)
				@OverleafAuthenticationManager.setupUser(@accessToken, @refreshToken, @profile, @callback)

			it "should not create a new user", ->
				@UserCreator.createNewUser.called.should.equal false

			it "should return a message about the email", ->
				@callback
					.calledWith(null, null, {
						email_exists_in_sl: true
						email: @profile.email
					})
					.should.equal true
