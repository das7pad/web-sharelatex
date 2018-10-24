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
			"../../../../../app/js/Features/User/UserUpdater":
				@UserUpdater = {}
			"logger-sharelatex": { log: sinon.stub(), err: sinon.stub() }
			"settings-sharelatex": @settings =
				accountMerge:
					secret: "banana"
			"jsonwebtoken": @jwt = {}
			"./SharelatexAuthHandler": @SharelatexAuthHandler = {}
			"../../../../../app/js/Features/Subscription/LimitationsManager":
				userHasSubscriptionOrIsGroupMember: sinon.stub()
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
			@AuthenticationController.finishLogin = sinon.stub()
			@AuthenticationController._setRedirectInSession = sinon.stub()
			@AuthenticationController.afterLoginSessionSetup =
				sinon.stub().yields()
			@jwt.verify = sinon.stub()
			@jwt.verify.withArgs(@token, @settings.accountMerge.secret).yields(null, @data)
			@SharelatexAuthController._createBackingAccountIfNeeded = sinon.stub().callsArgWith(2, null)
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
				@AuthenticationController.finishLogin
					.calledWith(@user, @req, @res, @next)
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

	describe "_createBackingAccountIfNeeded", ->
		beforeEach ->
			@user_id = "1234"
			@email = "user@example.com"
			@user = {_id: @user_id, email: @email}
			@v1Profile = {id: 123, email: @email}
			@SharelatexAuthHandler.createBackingAccount = sinon.stub().callsArgWith(1, null, @v1Profile)
			@UserUpdater.updateUser = sinon.stub().callsArgWith(2, null)
			@AuthenticationController._setRedirectInSession = sinon.stub()

		describe "when we're creating v1 accounts on login", ->
			beforeEach (done) ->
				@settings.createV1AccountOnLogin = true
				@SharelatexAuthController._createBackingAccountIfNeeded @user, @req, (err) =>
					@err = err
					done()

			it "should not produce an error", ->
				expect(@err).to.not.exist

			it "should create a backing account", ->
				expect(@SharelatexAuthHandler.createBackingAccount.callCount).to.equal 1
				expect(@SharelatexAuthHandler.createBackingAccount.calledWith(@user)).to.equal true

			it "should update the user record", ->
				expect(@UserUpdater.updateUser.callCount).to.equal 1
				expect(@UserUpdater.updateUser.calledWith(@user_id)).to.equal true
				expect(@UserUpdater.updateUser.lastCall.args[1]).to.deep.equal {
					$set: {'overleaf.id': @v1Profile.id, 'ace.overallTheme': 'light-'}
				}

			it "should set up a redirect in the session", ->
				expect(@AuthenticationController._setRedirectInSession.callCount).to.equal 1
				expect(@AuthenticationController._setRedirectInSession.calledWith(
					@req, '/login/sharelatex/finish'
				)).to.equal true

		describe "when we're creating v1 accounts on login, but it produces an error", ->
			beforeEach (done) ->
				@settings.createV1AccountOnLogin = true
				@SharelatexAuthHandler.createBackingAccount = sinon.stub().callsArgWith(1, new Error('woops'))
				@SharelatexAuthController._createBackingAccountIfNeeded @user, @req, (err) =>
					@err = err
					done()

			it "should produce an error", ->
				expect(@err).to.exist

			it "should not update the user record", ->
				expect(@UserUpdater.updateUser.callCount).to.equal 0
				expect(@UserUpdater.updateUser.calledWith(@user_id)).to.equal false

		describe "when we're not creating v1 accounts on login", ->
			beforeEach (done) ->
				@settings.createV1AccountOnLogin = false
				@SharelatexAuthController._createBackingAccountIfNeeded @user, @req, (err) =>
					@err = err
					done()

			it "should not produce an error", ->
				expect(@err).to.not.exist

			it "should return the callback immediately and not create a backing account", ->
				expect(@SharelatexAuthHandler.createBackingAccount.callCount).to.equal 0
				expect(@SharelatexAuthHandler.createBackingAccount.calledWith(@user)).to.equal false
