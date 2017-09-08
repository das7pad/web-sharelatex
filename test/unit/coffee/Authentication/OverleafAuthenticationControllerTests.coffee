should = require('chai').should()
SandboxedModule = require('sandboxed-module')
assert = require('assert')
path = require('path')
modulePath = path.join __dirname, '../../../../app/js/Authentication/OverleafAuthenticationController'
sinon = require("sinon")
expect = require("chai").expect

describe "OverleafAuthenticationController", ->
	beforeEach ->
		@OverleafAuthenticationController = SandboxedModule.require modulePath, requires:
			"../../../../../app/js/Features/Authentication/AuthenticationController": @AuthenticationController = {}
			"logger-sharelatex": { log: sinon.stub() }
			"passport": @passport = {}
		@req =
			logIn: sinon.stub()
		@res =
			redirect: sinon.stub()

	describe "setupUser", ->
		describe "with a conflicting email", ->
			beforeEach ->
				# Our code is wrapped in passport:
				# (req, res, next) ->
				# 	passport.authenticate("oauth2", (err, user, info) ->
				# 		method we want to test...
				# 	)(req, res, next)
				@passport.authenticate = (provider, method) =>
					return (req, res, next) =>
						method(null, null, {
							email_exists_in_sl: true
							email: @email = "test@example.com"
						})
				@OverleafAuthenticationController.setupUser @req, @res, @next
			
			it "should redirect to /overleaf/email_exists", ->
				@res.redirect
					.calledWith("/overleaf/email_exists?email=#{encodeURIComponent(@email)}")
					.should.equal true
			
		describe "with a successful user set up", ->
			beforeEach ->
				@passport.authenticate = (provider, method) =>
					return (req, res, next) =>
						method(null, @user = {"mock": "user"}, null)
				@OverleafAuthenticationController.setupUser @req, @res, @next

			it "should log the user in", ->
				@req.logIn
					.calledWith(@user, @next)
					.should.equal true

	describe "doLogin", ->
		beforeEach ->
			@user = {"mock": "user"}
			@req.user = @user
			@AuthenticationController.afterLoginSessionSetup = sinon.stub().yields()
			@AuthenticationController._getRedirectFromSession = sinon.stub()
			@AuthenticationController._getRedirectFromSession.withArgs(@req).returns @redir = "/redir/path"
			@OverleafAuthenticationController.doLogin @req, @res, @next

		it "should call AuthenticationController.afterLoginSessionSetup", ->
			@AuthenticationController.afterLoginSessionSetup
				.calledWith(@req, @user)
				.should.equal true

		it "should redirect to the stored rediret", ->
			@res.redirect
				.calledWith(@redir)
				.should.equal true
