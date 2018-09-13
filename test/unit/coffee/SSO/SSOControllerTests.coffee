SandboxedModule = require "sandboxed-module"
assert = require "assert"
Path = require "path"
modulePath = Path.join __dirname, "../../../../app/js/SSO/SSOController"
sinon = require "sinon"
sinonChai = require "sinon-chai"
chai = require "chai"
chai.use sinonChai
expect = chai.expect

describe "SSOController", ->
	beforeEach ->
		@SSOController = SandboxedModule.require modulePath, requires:
			"../V1Login/V1LoginController":
				@V1LoginController = {}
			"../V1Login/V1LoginHandler":
				@V1LoginHandler = {}
			"logger-sharelatex": { log: sinon.stub(), err: sinon.stub() }
		@req = {
			session: {}
			user: {}
		}
		@res =
			json: sinon.stub()
			status: sinon.stub()
			send: sinon.stub()
			redirect: sinon.stub()
		@res.status.returns(@res)
		@next = sinon.stub()

	describe "authCallback", ->
		beforeEach ->
			@profile = { profile: true }
			@V1LoginController._login = sinon.stub()
			@SSOController._signUp = sinon.stub()
			@SSOController._errorRedirect = sinon.stub()

		describe "when user exists", ->
			beforeEach ->
				@V1LoginHandler.authWithV1 = sinon.stub().callsArgWith 1, null, true, @profile

			describe "with intent to sign_in", ->
				beforeEach ->
					@req.session.sso_intent = "sign_in"
					@SSOController.authCallback @req, @res, @next

				it "should login", ->
					expect(@V1LoginController._login).to.have.been.calledWith @profile, @req, @res, @next

			describe "with intent to sign_up", ->
				beforeEach ->
					@req.session.sso_intent = "sign_up"
					@SSOController.authCallback @req, @res, @next

				it "should login", ->
					expect(@V1LoginController._login).to.have.been.calledWith @profile, @req, @res, @next

		describe "when user does not exist", ->
			beforeEach ->
				@V1LoginHandler.authWithV1 = sinon.stub().callsArgWith 1, null, false

			describe "with intent to sign_in", ->
				beforeEach ->
					@req.session.sso_intent = "sign_in"
					@SSOController.authCallback @req, @res, @next

				it "should redirect with error", ->
					expect(@SSOController._errorRedirect).to.have.been.calledWith @res, "not_registered"

			describe "with intent to sign_up", ->
				beforeEach ->
					@req.session.sso_intent = "sign_up"

				describe "when user has email", ->
					beforeEach ->
						@req.user.email = "test@email.com"
						@SSOController.authCallback @req, @res, @next

					it "should attempt sign up", ->
						expect(@SSOController._signUp).to.have.been.calledWith @req.user, @req, @res, @next

				describe "when user does not have email", ->
					beforeEach ->
						@SSOController.authCallback @req, @res, @next

					it "should redirect to email form", ->
						expect(@res.redirect).to.have.been.calledWith "/register/sso_email"

		describe "when intent not in session", ->
			beforeEach ->
				@SSOController.authCallback @req, @res, @next

			it "should return error", ->
				expect(@next).to.have.been.calledWith new Error "invalid intent"

	describe "postRegisterSSOEmail", ->

		describe "when user not in session", ->
			beforeEach ->
				@SSOController.postRegisterSSOEmail @req, @res, @next

			it "should return error", ->
				expect(@res.json).to.have.been.calledWith { type: "error", text: "An error occurred. Please try again." }

		describe "when user does not have email", ->
			beforeEach ->
				@req.session.sso_user = {}
				@req.body = {}
				@SSOController.postRegisterSSOEmail @req, @res, @next

			it "should return error", ->
				expect(@res.json).to.have.been.calledWith { type: "error", text: "Email Required" }

		describe "when user has email", ->
			beforeEach ->
				@req.session.sso_user = {}
				@req.body = { email: "test@email.com" }
				@SSOController._signUpForm = sinon.stub()
				@SSOController.postRegisterSSOEmail @req, @res, @next

			it "should attempt sign up", ->
				expect(@SSOController._signUpForm).to.have.been.calledWith { email: "test@email.com" }, @req, @res, @next

	describe "_signUp", ->
		beforeEach ->
			@V1LoginController._login = sinon.stub()
			@SSOController._errorRedirect = sinon.stub()
			@req.session.sso_user = "mock-user"
			@profile = { profile: true }
	
		describe "when account registered", ->
			beforeEach ->	
				@V1LoginHandler.registerWithV1 = sinon.stub().callsArgWith 1, null, true, @profile
				@SSOController._signUp "mock-user", @req, @res, @next

			it "should login", ->
				expect(@V1LoginController._login).to.have.been.calledWith @profile, @req, @res, @next
				expect(@SSOController._errorRedirect).not.to.have.been.called

			it "should clear sso_user from session", ->
				expect(@req.session.sso_user).to.be.undefined

		describe "when error occurs", ->
			beforeEach ->	
				@V1LoginHandler.registerWithV1 = sinon.stub().callsArgWith 1, "error"
				@SSOController._signUp "mock-user", @req, @res, @next

			it "should return error", ->
				expect(@SSOController._errorRedirect).to.have.been.calledWith @res, "register"

		describe "when email exists", ->
			beforeEach ->
				@profile = { email: "test@email.com" }
				@V1LoginHandler.registerWithV1 = sinon.stub().callsArgWith 1, null, false, @profile
				@SSOController._signUp "mock-user", @req, @res, @next

			it "should return error", ->
				expect(@SSOController._errorRedirect).to.have.been.calledWith @res, "email_already_registered"

		describe "when account not registered", ->
			beforeEach ->
				@V1LoginHandler.registerWithV1 = sinon.stub().callsArgWith 1, null, false, @profile
				@SSOController._signUp "mock-user", @req, @res, @next

			it "should return error", ->
				expect(@SSOController._errorRedirect).to.have.been.calledWith @res, "register"

	describe "_signUpForm", ->
		beforeEach ->
			@V1LoginController._login = sinon.stub()
			@req.session.sso_user = "mock-user"
			@profile = { profile: true }
	
		describe "when account registered", ->
			beforeEach ->	
				@V1LoginHandler.registerWithV1 = sinon.stub().callsArgWith 1, null, true, @profile
				@SSOController._signUpForm "mock-user", @req, @res, @next

			it "should login", ->
				expect(@V1LoginController._login).to.have.been.calledWith @profile, @req, @res, @next
				expect(@res.json).not.to.have.been.called

			it "should clear sso_user from session", ->
				expect(@req.session.sso_user).to.be.undefined

		describe "when error occurs", ->
			beforeEach ->	
				@V1LoginHandler.registerWithV1 = sinon.stub().callsArgWith 1, "error"
				@SSOController._signUpForm "mock-user", @req, @res, @next

			it "should return error", ->
				expect(@res.json).to.have.been.calledWith message: { type: "error", text: "An error occurred" }

		describe "when email exists", ->
			beforeEach ->
				@profile = { email: "test@email.com" }
				@V1LoginHandler.registerWithV1 = sinon.stub().callsArgWith 1, null, false, @profile
				@req.i18n = translate: sinon.stub().returns("mock-error")
				@SSOController._signUpForm "mock-user", @req, @res, @next

			it "should return error", ->
				expect(@req.i18n.translate).to.have.been.calledWith "email_already_registered"
				expect(@res.json).to.have.been.calledWith message: { type: "error", text: "mock-error" }

		describe "when account not registered", ->
			beforeEach ->
				@V1LoginHandler.registerWithV1 = sinon.stub().callsArgWith 1, null, false, @profile
				@SSOController._signUpForm "mock-user", @req, @res, @next

			it "should return error", ->
				expect(@res.json).to.have.been.calledWith message: { type: "error", text: "An error occurred" }