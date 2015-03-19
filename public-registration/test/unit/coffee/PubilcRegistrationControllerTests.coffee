sinon = require('sinon')
chai = require('chai')
should = chai.should()
expect = chai.expect
modulePath = "../../../app/js/PublicRegistrationController.js"
SandboxedModule = require('sandboxed-module')
events = require "events"
ObjectId = require("mongojs").ObjectId
assert = require("assert")

describe "UserController", ->
	beforeEach ->
		@user_id = "323123"

		@user =
			_id:@user_id
			save:sinon.stub().callsArgWith(0)
			ace:{}

		@UserRegistrationHandler =
			registerNewUser: sinon.stub()
		@AuthenticationController =
			establishUserSession: sinon.stub().callsArg(2)
		@ReferalAllocator =
			allocate:sinon.stub()
		@SubscriptionDomainAllocator = 
			autoAllocate:sinon.stub()
		@UserUpdater =
			changeEmailAddress:sinon.stub()
		@EmailHandler =
			sendEmail:sinon.stub().callsArgWith(2)
		@PublicRegistrationController = SandboxedModule.require modulePath, requires:
			"../../../../app/js/Features/User/UserRegistrationHandler":@UserRegistrationHandler
			"../../../../app/js/Features/Authentication/AuthenticationController": @AuthenticationController
			"../../../../app/js/Features/Referal/ReferalAllocator":@ReferalAllocator
			"../../../../app/js/Features/Subscription/SubscriptionDomainAllocator":@SubscriptionDomainAllocator
			"../../../../app/js/Features/Email/EmailHandler": @EmailHandler
			"logger-sharelatex": {log:->}
			"metrics-sharelatex": { inc: () ->}


		@req = 
			session: 
				destroy:->
				user :
					_id : @user_id
			body:{}
		@res = {}
		@next = sinon.stub()
		
	describe "register", ->
		it "should ask the UserRegistrationHandler to register user", (done)->
			@UserRegistrationHandler.registerNewUser.callsArgWith(1, null, @user)
			@res.send = =>
				@UserRegistrationHandler.registerNewUser.calledWith(@req.body).should.equal true
				done()
			@PublicRegistrationController.register @req, @res

		it "should try and log the user in if there is an EmailAlreadyRegistered error", (done)->

			@UserRegistrationHandler.registerNewUser.callsArgWith(1, new Error("EmailAlreadyRegistered"))
			@AuthenticationController.login = (req, res)=>
				assert.deepEqual req, @req
				assert.deepEqual res, @res
				done()
			@PublicRegistrationController.register @req, @res

		it "should put the user on the session and mark them as justRegistered", (done)->
			@UserRegistrationHandler.registerNewUser.callsArgWith(1, null, @user)
			@res.send = =>
				@AuthenticationController.establishUserSession
					.calledWith(@req, @user)
					.should.equal true
				assert.equal @req.session.justRegistered, true
				done()
			@PublicRegistrationController.register @req, @res

		it "should redirect to project page", (done)->
			@UserRegistrationHandler.registerNewUser.callsArgWith(1, null, @user)
			@res.send = (opts)=>
				opts.redir.should.equal "/project"
				done()
			@PublicRegistrationController.register @req, @res			


		it "should redirect passed redir if it exists", (done)->
			@UserRegistrationHandler.registerNewUser.callsArgWith(1, null, @user)
			@req.body.redir = "/somewhere"
			@res.send = (opts)=>
				opts.redir.should.equal "/somewhere"
				done()
			@PublicRegistrationController.register @req, @res

		it "should allocate the referals", (done)->
			@req.session =
				referal_id : "23123"
				referal_source : "email"
				referal_medium : "bob"
				
			@UserRegistrationHandler.registerNewUser.callsArgWith(1, null, @user)
			@req.body.redir = "/somewhere"
			@res.send = (opts)=>
				@ReferalAllocator.allocate.calledWith(@req.session.referal_id, @user._id, @req.session.referal_source, @req.session.referal_medium).should.equal true
				done()
			@PublicRegistrationController.register @req, @res			
			
		it "should auto allocate the subscription for that domain", (done)->
			@UserRegistrationHandler.registerNewUser.callsArgWith(1, null, @user)
			@res.send = (opts)=>
				@SubscriptionDomainAllocator.autoAllocate.calledWith(@user).should.equal true
				done()
			@PublicRegistrationController.register @req, @res

		it "should send a welcome email", (done)->
			@UserRegistrationHandler.registerNewUser.callsArgWith(1, null, @user)
			@res.send = (opts)=>
				@EmailHandler.sendEmail.calledWith("welcome").should.equal true
				done()
			@PublicRegistrationController.register @req, @res	
