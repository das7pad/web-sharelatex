sinon = require('sinon')
chai = require('chai')
should = chai.should()
expect = chai.expect
modulePath = "../../../app/js/PublicRegistrationController.js"
SandboxedModule = require('sandboxed-module')
events = require "events"
ObjectId = require("mongojs").ObjectId
assert = require("assert")

describe "PublicRegistrationController", ->
	beforeEach ->
		@user_id = "323123"

		@user =
			_id:@user_id
			save:sinon.stub().callsArgWith(0)
			ace:{}

		@UserRegistrationHandler =
			registerNewUser: sinon.stub()
		@ReferalAllocator =
			allocate:sinon.stub().yields()
		@SubscriptionDomainHandler =
			getDomainLicencePage:sinon.stub()
		@UserUpdater =
			changeEmailAddress:sinon.stub()
		@UserEmailsConfirmationHandler =
			sendConfirmationEmail: sinon.stub().yields()
		@UserHandler =
			populateTeamInvites: sinon.stub().callsArgWith(1).yields()
		@AuthenticationController =
			passportLogin: sinon.stub()
			_getRedirectFromSession: sinon.stub().returns("/somewhere")
			_clearRedirectFromSession: sinon.stub()
		@UserSessionsManager =
			trackSession:sinon.stub().yields()
		@AnalyticsManager =
			identifyUser:sinon.stub()
		@PublicRegistrationController = SandboxedModule.require modulePath, requires:
			"../../../../app/js/Features/User/UserRegistrationHandler":@UserRegistrationHandler
			"../../../../app/js/Features/Referal/ReferalAllocator":@ReferalAllocator
			"../../../../app/js/Features/Subscription/SubscriptionDomainHandler":@SubscriptionDomainHandler
			"../../../../app/js/Features/Email/Layouts/PersonalEmailLayout":{}
			"../../../../app/js/Features/Email/EmailBuilder": templates:{welcome:{}}, CTAEmailTemplate: sinon.stub()
			"../../../../app/js/Features/Email/EmailHandler": {}
			"../../../../app/js/Features/User/UserHandler": @UserHandler
			"../../../../app/js/Features/User/UserEmailsConfirmationHandler": @UserEmailsConfirmationHandler
			"../../../../app/js/Features/Authentication/AuthenticationController": @AuthenticationController
			"../../../../app/js/Features/User/UserSessionsManager":@UserSessionsManager
			"../../../../app/coffee/Features/Analytics/AnalyticsManager": @AnalyticsManager
			"logger-sharelatex": {log:->}
			"metrics-sharelatex": { inc: () ->}
			"settings-sharelatex": {}

		@req =
			session:
				destroy:->
				user :
					_id : @user_id
			body:{}
			login: sinon.stub().callsArgWith(1, null)  # passport
		@res = {json: sinon.stub()}
		@next = sinon.stub()

	describe "register", ->

		beforeEach ->
			@AuthenticationController._getRedirectFromSession = sinon.stub().returns(null)
			@req.session.passport = {user: {_id: @user_id}}

		it "should ask the UserRegistrationHandler to register user", (done)->
			@UserRegistrationHandler.registerNewUser.callsArgWith(1, null, @user)
			@res.json = =>
				@UserRegistrationHandler.registerNewUser.calledWith(@req.body).should.equal true
				done()
			@PublicRegistrationController.register @req, @res

		it "should try and log the user in if there is an EmailAlreadyRegistered error", (done)->

			@UserRegistrationHandler.registerNewUser.callsArgWith(1, new Error("EmailAlreadyRegistered"))
			@PublicRegistrationController.register @req, @res, @next
			@req.login.callCount.should.equal 0
			@req.login.calledWith(@user).should.equal false
			@AuthenticationController.passportLogin.callCount.should.equal 1
			@AuthenticationController.passportLogin.calledWith(@req, @res, @next).should.equal true
			done()

		it "should tell the user about the overleaf beta if trying to register with an existing linked overleaf email", (done)->
			@UserRegistrationHandler.registerNewUser.callsArgWith(1, new Error("EmailAlreadyRegistered"), { overleaf: { id: "exists" }})
			@res.json = (opts)=>
				opts.message.text.should.equal "You are already registered in ShareLaTeX through the Overleaf Beta. Please log in via Overleaf."
				done()
			@PublicRegistrationController.register @req, @res, @next

		it "should put the user on the session and mark them as justRegistered", (done)->
			@UserRegistrationHandler.registerNewUser.callsArgWith(1, null, @user)
			@res.json = =>
				@req.login
					.calledWith(@user)
					.should.equal true
				assert.equal @req.session.justRegistered, true
				done()
			@PublicRegistrationController.register @req, @res

		it "should redirect to project page", (done)->
			@UserRegistrationHandler.registerNewUser.callsArgWith(1, null, @user)
			@res.json = (opts)=>
				opts.redir.should.equal "/project"
				done()
			@PublicRegistrationController.register @req, @res

		it "should redirect passed redir if it exists", (done)->
			@UserRegistrationHandler.registerNewUser.callsArgWith(1, null, @user)
			@AuthenticationController._getRedirectFromSession = sinon.stub().returns('/somewhere')
			@res.json = (opts)=>
				opts.redir.should.equal "/somewhere"
				done()
			@PublicRegistrationController.register @req, @res

		it "should allocate the referals", (done)->
			@req.session =
				referal_id : "23123"
				referal_source : "email"
				referal_medium : "bob"
				passport: {user: {_id: @user_id}}

			@UserRegistrationHandler.registerNewUser.callsArgWith(1, null, @user)
			@AuthenticationController._getRedirectFromSession = sinon.stub().returns('/somewhere')
			@res.json = (opts)=>
				@ReferalAllocator.allocate.calledWith(@req.session.referal_id, @user._id, @req.session.referal_source, @req.session.referal_medium).should.equal true
				done()
			@PublicRegistrationController.register @req, @res

		it "should call populateTeamInvites", (done)->
			@UserRegistrationHandler.registerNewUser.callsArgWith(1, null, @user)
			@res.json = (opts)=>
				@UserHandler.populateTeamInvites.calledWith(@user).should.equal true
				done()
			@PublicRegistrationController.register @req, @res


		it "should send user to verifiy link if they are part of domain licnece", (done)->
			@UserRegistrationHandler.registerNewUser.callsArgWith(1, null, @user)
			stubbedVerifiyLink = "/go/here/domain/person"
			@SubscriptionDomainHandler.getDomainLicencePage.returns(stubbedVerifiyLink)
			@res.json = (opts)=>
				@SubscriptionDomainHandler.getDomainLicencePage.calledWith(@user).should.equal true
				opts.redir.should.equal stubbedVerifiyLink
				done()
			@PublicRegistrationController.register @req, @res

		it "should send a welcome email", (done)->
			@UserRegistrationHandler.registerNewUser.callsArgWith(1, null, @user)
			@res.json = (opts)=>
				@UserEmailsConfirmationHandler.sendConfirmationEmail.calledWith(@user._id, @user.email, 'welcome').should.equal true
				done()
			@PublicRegistrationController.register @req, @res
