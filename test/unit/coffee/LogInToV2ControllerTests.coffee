should = require('chai').should()
SandboxedModule = require('sandboxed-module')
assert = require('assert')
Path = require('path')
modulePath = Path.join __dirname, '../../../app/js/LogInToV2Controller'
sinon = require("sinon")
expect = require("chai").expect

describe "LogInToV2Controller", ->
	beforeEach ->
		@User = {}
		@LogInToV2Controller = SandboxedModule.require modulePath, requires:
			"../../../../app/js/models/User": {User: @User}
			"../../../../app/js/Features/User/UserGetter": @UserGetter = {}
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
			"../../../../app/js/Features/Analytics/AnalyticsManager": {
				recordEvent: sinon.stub()
			}
			"../../../../app/js/Features/Subscription/LimitationsManager": {
				userHasSubscriptionOrIsGroupMember: sinon.stub()
			}

		@req = {}
		@res =
			redirect: sinon.stub()
		@next = sinon.stub()

	describe "showLogInToV2Interstitial", ->
		beforeEach ->
			@user_id = "mock-user-id"
			@UserGetter.getUser = sinon.stub().callsArgWith(2, null, {_id: @user_id})
			@AuthenticationController.getLoggedInUserId =
				sinon.stub().withArgs(@req).returns(@user_id)

		describe "when choosing to not merge", ->
			beforeEach ->
				@req.query = {
					dont_link: 'true'
				}
				@LogInToV2Controller.signAndRedirectToLogInToV2 = sinon.stub()
				@LogInToV2Controller.showLogInToV2Interstitial(@req, @res, @next)

			it "should sign and redirect to log in to v2", ->
				@LogInToV2Controller.signAndRedirectToLogInToV2.calledWith(
					@req,
					@res,
					@next
				).should.equal true

		describe "when the user is already linked", ->
			beforeEach ->
				@UserGetter.getUser = sinon.stub().callsArgWith(2, null, {_id: @user_id, overleaf: {id: 123}})
				@LogInToV2Controller.signAndRedirectToLogInToV2 = sinon.stub()
				@V1UserFinder.hasV1AccountNotLinkedYet = sinon.stub()
				@LogInToV2Controller.showLogInToV2Interstitial(@req, @res, @next)

			it "should just send the user to v2", ->
				@LogInToV2Controller.signAndRedirectToLogInToV2.calledWith(
					@req,
					@res,
					@next
				).should.equal true
				@V1UserFinder.hasV1AccountNotLinkedYet.callCount.should.equal 0

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

	describe "doPassportLoginHook", ->
		beforeEach ->
			@email = "user@example.com"
			@call = (cb) =>
				@LogInToV2Controller.doPassportLoginHook @req, @email, cb

		describe "when we're not creating v1 accounts on login", ->
			beforeEach ->
				@settings.createV1AccountOnLogin = false
				@user = {_id: '1234', email: @email, overleaf: {id: 21}}
				@User.findOne = sinon.stub().callsArgWith(2, null, @user)

				it "should return callback immediately and not check for User", (done) ->
					@call (err, info) =>
						expect(err).to.not.exist
						expect(info).to.not.exist
						expect(@User.findOne.callCount).to.equal 0
						expect(@User.findOne.calledWith({email: @email})).to.equal false
						done()

		describe "when we are creating v1 accounts on login", ->
			beforeEach ->
				@settings.createV1AccountOnLogin = true

			describe "when the user is already linked to an overleaf v1 account", ->
				beforeEach ->
					@user = {_id: '1234', email: @email, overleaf: {id: 21}}
					@User.findOne = sinon.stub().callsArgWith(2, null, @user)

				it "should get the user, then return a redirect instruction", (done) ->
					@call (err, info) =>
						expect(err).to.not.exist
						expect(info).to.deep.equal({redir: '/migrated-to-overleaf'})
						expect(@User.findOne.callCount).to.equal 1
						expect(@User.findOne.calledWith({email: @email})).to.equal true
						done()

			describe "when the user is not linked to an overleaf v1 account", ->
				beforeEach ->
					@AuthenticationController._setRedirectInSession = sinon.stub()
					@user = {_id: '1234', email: @email}
					@User.findOne = sinon.stub().callsArgWith(2, null, @user)

				it "should get the user, then return nothing", (done) ->
					@call (err, info) =>
						expect(err).to.not.exist
						expect(info).to.not.exist
						expect(@User.findOne.callCount).to.equal 1
						expect(@User.findOne.calledWith({email: @email})).to.equal true
						expect(@AuthenticationController._setRedirectInSession.callCount).to.equal 1
						done()
