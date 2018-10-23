SandboxedModule = require "sandboxed-module"
assert = require "assert"
Path = require "path"
modulePath = Path.join __dirname, "../../../../app/js/V1Login/V1LoginController"
sinon = require "sinon"
sinonChai = require "sinon-chai"
chai = require "chai"
chai.use sinonChai
expect = chai.expect

describe "V1LoginController", ->
	beforeEach ->
		@V1LoginController = SandboxedModule.require modulePath, requires:
			"./V1LoginHandler":
				@V1LoginHandler = {}
			"../../../../../app/js/Features/User/UserGetter":
				@UserGetter = {}
			"../../../../../app/js/Features/Authentication/AuthenticationController":
				@AuthenticationController = {}
			"../../../../../app/js/Features/User/UserRegistrationHandler":
				@UserRegistrationHandler = {}
			"../../../../../app/js/Features/Newsletter/NewsletterManager":
				@NewsletterManager = sinon.mock()
			"../Authentication/OverleafAuthenticationManager":
				@OverleafAuthenticationManager = {}
			"../Authentication/OverleafAuthenticationController":
				@OverleafAuthenticationController = {}
			"../../../../../app/js/Features/Referal/ReferalAllocator":
				@ReferalAllocator = {}
			"../Collabratec/CollabratecController":
				@CollabratecController = {}
			"logger-sharelatex": { log: sinon.stub(), err: sinon.stub() }
		@req = {
			session: @session = {}
			user: {}
		}
		@res =
			json: sinon.stub()
			status: sinon.stub()
			send: sinon.stub()
			redirect: sinon.stub()
		@res.status.returns(@res)
		@next = sinon.stub()

	describe "loginProfile", ->
		beforeEach ->
			@profile = { profile: true }
			@V1LoginController._setupUser = sinon.stub()

		describe "when profile in sesssion", ->
			beforeEach ->
				@req.session.login_profile = @profile
				@V1LoginController.loginProfile @req, @res, @next

			it "should setup user", ->
				expect(@V1LoginController._setupUser).to.have.been.called

			it "should delete profile from session", ->
				expect(@req.session.login_profile).not.to.be.defined

		describe "when profile is not in session", ->
			beforeEach ->
				@V1LoginController.loginProfile @req, @res, @next

			it "should return error", ->
				expect(@next).to.have.been.calledWith new Error "missing profile"

			it "should not setup user", ->
				expect(@V1LoginController._setupUser).not.to.have.been.called

	describe "_login", ->
		beforeEach ->
			@profile = { profile: true }
			@V1LoginController._setupUser = sinon.stub()

		describe "when v2 user exists", ->
			beforeEach ->
				@UserGetter.getUser = sinon.stub().callsArgWith(2, null, 'v2-user')
				@V1LoginController._login @profile, @req, @res, @next

			it "should setup user", ->
				expect(@V1LoginController._setupUser).to.have.been.called

		describe "when v2 user does not exist", ->
			beforeEach ->
				@UserGetter.getUser = sinon.stub().callsArg(2)
				@V1LoginController._login @profile, @req, @res, @next

			it "should not setup user", ->
				expect(@V1LoginController._setupUser).not.to.have.been.called

			it "should set profile in session", ->
				expect(@session.login_profile).to.deep.equal @profile

			it "should redirect to /overleaf/auth_from_v1", ->
				expect(@res.redirect).to.have.been.calledWith "/overleaf/auth_from_v1"

			describe "when called as api", ->
				beforeEach ->
					@req.headers = accept: "application/json"
					@V1LoginController._login @profile, @req, @res, @next

				it "should return json", ->
					expect(@res.json).to.have.been.calledWith { redir: "/overleaf/auth_from_v1" }

	describe "_setupUser", ->
		beforeEach ->
			@profile = { email: "email" }
			@OverleafAuthenticationController.prepareAccountMerge = sinon.stub().returns("redirect")
			@CollabratecController._completeOauthLink = sinon.stub().callsArg(2)
			@AuthenticationController.finishLogin = sinon.stub()

		describe "when email exists in sl", ->
			beforeEach ->
				@info = email_exists_in_sl: true
				@OverleafAuthenticationManager.setupUser = sinon.stub().callsArgWith(1, null, "user", @info)
				@V1LoginController._setupUser @profile, @req, @res, @next

			it "should check if email exists", ->
				expect(@OverleafAuthenticationManager.setupUser).to.have.been.calledWith @profile

			it "should redirect", ->
				expect(@res.redirect).to.have.been.calledWith "redirect"

			describe "when called as api", ->
				beforeEach ->
					@req.headers = accept: "application/json"
					@V1LoginController._setupUser @profile, @req, @res, @next

				it "should return json", ->
					expect(@res.json).to.have.been.calledWith { redir: "redirect" }

		describe "when email does not exists in sl", ->
			beforeEach ->
				@info = email_exists_in_sl: false
				@OverleafAuthenticationManager.setupUser = sinon.stub().callsArgWith(1, null, 'user', @info)
				@V1LoginController._setupUser @profile, @req, @res, @next

			it "should complete oauth link", ->
				expect(@CollabratecController._completeOauthLink).to.have.been.called
