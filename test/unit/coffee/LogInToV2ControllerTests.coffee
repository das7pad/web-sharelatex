should = require('chai').should()
SandboxedModule = require('sandboxed-module')
assert = require('assert')
Path = require('path')
modulePath = Path.join __dirname, '../../../app/js/LogInToV2Controller'
sinon = require("sinon")
expect = require("chai").expect

describe "LogInToV2Controller", ->
	beforeEach ->
		@LogInToV2Controller = SandboxedModule.require modulePath, requires:
			"../../../../app/js/Features/Authentication/AuthenticationController":
				@AuthenticationController = {}
			"./V1UserFinder": @V1UserFinder =
				hasV1AccountNotLinkedYet: (userId, callback)->
					callback(null, "test@example.com", false)

			"logger-sharelatex": { log: sinon.stub(), err: sinon.stub() }
			"settings-sharelatex": @settings =
				accountMerge:
					betaHost: "http://beta.example.com"
					secret: "banana"
			"jsonwebtoken": @jwt = {}

		@req = {}
		@res =
			redirect: sinon.stub()
		@next = sinon.stub()

	describe "signAndRedirectToLogInToV2", ->
		beforeEach ->
			@user_id = "mock-user-id"
			@AuthenticationController.getLoggedInUserId =
				sinon.stub().withArgs(@req).returns(@user_id)
			@jwt.sign = sinon.stub().returns(@token = "mock-token")
			@LogInToV2Controller.signAndRedirectToLogInToV2(@req, @res, @next)

		it "should sign a log-in request", ->
			@jwt.sign
				.calledWith(
					{ user_id: @user_id, login: true },
					@settings.accountMerge.secret,
					{ expiresIn: '1m' }
				)
				.should.equal true

		it "should redirect back to the v2 site with the token", ->
			@res.redirect
				.calledWith(
					"http://beta.example.com/overleaf/auth_from_sl?token=#{@token}"
				)
				.should.equal true
