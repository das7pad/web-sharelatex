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
			i18n:
				translate: sinon.stub().returnsArg(0)
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

	describe "doPasswordChange", ->
		beforeEach ->
			@oldPassword = 'passw0rd'
			@newPassword = 'w0mb4t5'
			@badPassword = '1337h4x0r'
			@userid = '1234'
			@email = 'foo@example.org'
			@v1Id = 5
			@lightUser =
				_id: @userid
			@user =
				_id: @userid
				email: @email
				overleaf:
					id: @v1Id
			@baduser =
				_id: @userid
				email: @email
				overleaf:
					id: -1
			@req.body =
				newPassword1: @newPassword
				newPassword2: @newPassword
			@AuthenticationController.getSessionUser = sinon.stub().returns(@lightUser)
			@UserGetter.getUser = sinon.stub().withArgs(@userid).callsArgWith(1, null, @user)
			@V1LoginHandler.doPasswordChange = sinon.stub()
			@V1LoginHandler.doPasswordChange.withArgs({@email, @v1Id, password: @newPassword, current_password: @oldPassword}).callsArgWith(1, null, true)
			@V1LoginHandler.doPasswordChange.withArgs({@email, @v1Id, password: @newPassword, current_password: @badPassword}).callsArgWith(1, null, false)
			@V1LoginHandler.doPasswordChange.withArgs({@email, v1Id: -1, password: @newPassword, current_password: @oldPassword}).callsArgWith(1, new Error(), null)

		describe "when the details are valid", ->
			beforeEach ->
				@req.body.currentPassword = @oldPassword
				@V1LoginController.doPasswordChange(@req, @res, @next)

			it "should not return an error", ->
				expect(@next).not.to.have.been.called

			it "should try to change the password", ->
				expect(@V1LoginHandler.doPasswordChange).to.be.calledWith({@email, @v1Id, password: @newPassword, current_password: @oldPassword})

			it "should return a json success response", ->
				expect(@res.json).to.be.calledWith message: {
					type: 'success',
					@email,
					text: 'password_change_successful'
				}

		describe "when the old password is bad", ->
			beforeEach ->
				@req.body.currentPassword = @badPassword
				@V1LoginController.doPasswordChange(@req, @res, @next)

			it "should not return an error", ->
				expect(@next).not.to.have.been.called

			it "should try to change the password", ->
				expect(@V1LoginHandler.doPasswordChange).to.be.calledWith({@email, @v1Id, password: @newPassword, current_password: @badPassword})

			it "should return a json error response", ->
				expect(@res.json).to.be.calledWith message: {
					type: 'error',
					text: 'password_change_failed_attempt'
				}

		describe "when changing the password returns an error", ->
			beforeEach ->
				@req.body.currentPassword = @oldPassword
				@UserGetter.getUser = sinon.stub().withArgs(@userid).callsArgWith(1, null, @baduser)
				@V1LoginController.doPasswordChange(@req, @res, @next)

			it "should try to change the password", ->
				expect(@V1LoginHandler.doPasswordChange).to.be.calledWith({@email, v1Id: -1, password: @newPassword, current_password: @oldPassword})

			it "should return an error", ->
				expect(@next).to.be.called

		describe "when there are missing fields", ->
			beforeEach ->
				@req.body = {}
				@V1LoginController.doPasswordChange(@req, @res, @next)

			it "should not try to change the password", ->
				expect(@V1LoginHandler.doPasswordChange).not.to.be.called

			it "should return a json error response", ->
				expect(@res.json).to.be.calledWith message: {
					type: 'error',
					text: 'internal_error'
				}

		describe "when the new passwords do not match", ->
			beforeEach ->
				@req.body.newPassword2 = "#{@req.body.newPassword1}x"
				@req.body.currentPassword = @oldPassword
				@V1LoginController.doPasswordChange(@req, @res, @next)

			it "should not try to change the password", ->
				expect(@V1LoginHandler.doPasswordChange).not.to.be.called

			it "should return an error", ->
				expect(@res.json).to.be.calledWith message: {
					type: 'error',
					text: 'password_change_passwords_do_not_match'
				}

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
