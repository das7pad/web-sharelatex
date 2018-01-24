should = require('chai').should()
SandboxedModule = require('sandboxed-module')
assert = require('assert')
Path = require('path')
modulePath = Path.join __dirname, '../../../../app/js/SharelatexAuth/SharelatexAuthController'
sinon = require("sinon")
expect = require("chai").expect

describe "SharelatexAuthController", ->
	beforeEach ->
		@SharelatexAuthController = SandboxedModule.require modulePath, requires:
			"../../../../../app/js/Features/Authentication/AuthenticationController":
				@AuthenticationController = {}
			"../../../../../app/js/Features/User/UserGetter":
				@UserGetter = {}
			"logger-sharelatex": { log: sinon.stub(), err: sinon.stub() }
			"settings-sharelatex": @settings =
				accountMerge:
					secret: "banana"
			"jsonwebtoken": @jwt = {}
		@req = {}
		@res =
			status: sinon.stub()
			send: sinon.stub()
			redirect: sinon.stub()
		@res.status.returns(@res)
		@next = sinon.stub()

	describe "authFromSharelatex", ->
		beforeEach ->
			@token = "mock-token"
			@user_id = "mock-user-id"
			@data = {
				login: true
				user_id: @user_id
			}
			@user = {
				"mock": "user"
			}
			@UserGetter.getUser = sinon.stub()
			@UserGetter.getUser.withArgs(@user_id).yields(null, @user)
			@AuthenticationController.afterLoginSessionSetup =
				sinon.stub().yields()
			@jwt.verify = sinon.stub()
			@jwt.verify.withArgs(@token, @settings.accountMerge.secret).yields(null, @data)
			@req.query = token: @token

		describe "successfully", ->
			beforeEach ->
				@SharelatexAuthController.authFromSharelatex(@req, @res, @next)

			it "should verify the token", ->
				@jwt.verify
					.calledWith(@token, @settings.accountMerge.secret)
					.should.equal true

			it "should look up the user", ->
				@UserGetter.getUser
					.calledWith(@user_id)
					.should.equal true

			it "should log the user in", ->
				@AuthenticationController.afterLoginSessionSetup
					.calledWith(@req, @user)
					.should.equal true

			it "should redirect to /", ->
				@res.redirect
					.calledWith('/')
					.should.equal true

		describe "with no token", ->
			beforeEach ->
				@req.query = {}
				@SharelatexAuthController.authFromSharelatex(@req, @res, @next)

			it "should return a 400 invalid token error", ->
				@res.status.calledWith(400).should.equal true

		describe "with invalid token (no login parameter)", ->
			beforeEach ->
				delete @data.login
				@SharelatexAuthController.authFromSharelatex(@req, @res, @next)

			it "should return a 400 invalid token error", ->
				@res.status.calledWith(400).should.equal true

		describe "with invalid token (no user_id parameter)", ->
			beforeEach ->
				delete @data.user_id
				@SharelatexAuthController.authFromSharelatex(@req, @res, @next)

			it "should return a 400 invalid token error", ->
				@res.status.calledWith(400).should.equal true
