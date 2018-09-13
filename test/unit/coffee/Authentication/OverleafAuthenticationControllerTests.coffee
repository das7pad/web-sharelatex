should = require('chai').should()
SandboxedModule = require('sandboxed-module')
assert = require('assert')
Path = require('path')
modulePath = Path.join __dirname, '../../../../app/js/Authentication/OverleafAuthenticationController'
sinon = require("sinon")
expect = require("chai").expect

describe "OverleafAuthenticationController", ->
	beforeEach ->
		@OverleafAuthenticationController = SandboxedModule.require modulePath, requires:
			"../../../../../app/js/Features/Authentication/AuthenticationController": @AuthenticationController = {}
			"logger-sharelatex": { log: sinon.stub(), err: sinon.stub() }
			"passport": @passport = {}
			"settings-sharelatex": @settings =
				accountMerge:
					sharelatexHost: "http://sl.example.com"
					secret: "banana"
				overleaf:
					host: 'http://v1.example.com'
			"jsonwebtoken": @jwt = {}
			"../OverleafUsers/UserMapper": @UserMapper = {}
			"../../../../../app/js/Features/Subscription/FeaturesUpdater":
				@FeaturesUpdater = {refreshFeatures: sinon.stub()}
			"../../../../../app/js/models/User": { User: @User = {} }
			"../../../../../app/js/Features/User/UserController": @UserController = {}
			"../Collabratec/CollabratecController": {
				_completeOauthLink: sinon.stub().callsArgWith(2, null, false)
			}
			"../V1Login/V1LoginHandler": @V1LoginHandler = {}
		@req =
			logIn: sinon.stub()
			session: {}
		@res =
			redirect: sinon.stub()
			status: sinon.stub()
			send: sinon.stub()
			render: sinon.stub()
		@res.status.returns(@res)

	describe "logout", ->
		beforeEach ->
			@UserController._doLogout = sinon.stub().callsArgWith(1, null)
			@OverleafAuthenticationController.logout @req, @res, @next

		it "redirects to v1", () ->
			@res.redirect.calledWith(
				'http://v1.example.com/users/ensure_signed_out'
			).should.equal true

	describe "setupUser", ->
		describe "with a conflicting email", ->
			beforeEach ->
				# Our code is wrapped in passport:
				# (req, res, next) ->
				# 	passport.authenticate("oauth2", (err, user, info) ->
				# 		method we want to test...
				# 	)(req, res, next)
				@AuthenticationController.finishLogin = sinon.stub()
				@passport.authenticate = (provider, method) =>
					return (req, res, next) =>
						method(null, null, {
							email_exists_in_sl: true
							profile: @profile = {
								email: "test@example.com"
							}
							user_id: @user_id = "mock-sl-user-id"
						})
				@jwt.sign = sinon.stub().returns @token = "mock-token"
				@OverleafAuthenticationController.setupUser @req, @res, @next

			it 'should sign the redirect data in a JWT', ->
				@jwt.sign
					.calledWith(
						{ @user_id, overleaf_email: @profile.email, confirm_merge: true },
						@settings.accountMerge.secret,
						{ expiresIn: '1h' }
					)
					.should.equal true

			it 'should save the OAuth and user data in the session', ->
				expect(@req.session.accountMerge).to.deep.equal {
					@profile, @user_id
				}

			it "should render the confirmation page", ->
				@res.render
					.calledWith(
						Path.resolve(__dirname, "../../../../app/views/confirm_merge"),
						{
							redirect_url: "#{@settings.accountMerge.sharelatexHost}/user/confirm_account_merge?token=#{@token}"
							email: @profile.email
							suppressNavbar: true
						}
					)
					.should.equal true

		describe "with a successful user set up", ->
			beforeEach ->
				@AuthenticationController.finishLogin = sinon.stub()
				@passport.authenticate = (provider, method) =>
					return (req, res, next) =>
						method(null, @user = {"mock": "user"}, null)
				@OverleafAuthenticationController.setupUser @req, @res, @next

			it "should log the user in", ->
				@AuthenticationController.finishLogin
					.calledWith(@user, @req, @res, @next)
					.should.equal true

	describe "confirmedAccountMerge", ->
		beforeEach ->
			@token = "mock-token"
			@user_id = "mock-user-id"
			@data = {
				merge_confirmed: true
				user_id: @user_id
			}
			@AuthenticationController.finishLogin = sinon.stub()
			@UserMapper.mergeWithSlUser = sinon.stub().yields(null, @user = {"mock": "user"})
			@jwt.verify = sinon.stub()
			@jwt.verify.withArgs(@token, @settings.accountMerge.secret).yields(null, @data)
			@req.session.accountMerge = {
				user_id: @user_id
				profile: {
					email: "jim@example.com"
				}
			}
			@req.query = token: @token

		describe "successfully", ->
			beforeEach ->
				@OverleafAuthenticationController.confirmedAccountMerge(@req, @res, @next)

			it "should verify the token", ->
				@jwt.verify
					.calledWith(@token, @settings.accountMerge.secret)
					.should.equal true

			it "should merge with the SL user based on session data", ->
				@UserMapper.mergeWithSlUser
					.calledWith(
						@user_id,
						@req.session.accountMerge.profile
					)
					.should.equal true

			it "should log the user in", ->
				@AuthenticationController.finishLogin
					.calledWith(@user, @req, @res, @next)
					.should.equal true

		describe "with no token", ->
			beforeEach ->
				@req.query = {}
				@OverleafAuthenticationController.confirmedAccountMerge(@req, @res, @next)

			it "should return a 400 invalid token error", ->
				@res.status.calledWith(400).should.equal true

			it "should not try to verify the token", ->
				@jwt.verify.called.should.equal false

		describe "with invalid token (no merge_confirmed parameter)", ->
			beforeEach ->
				delete @data.merge_confirmed
				@OverleafAuthenticationController.confirmedAccountMerge(@req, @res, @next)

			it "should return a 400 invalid token error", ->
				@res.status.calledWith(400).should.equal true

		describe "when user_id in token doesn't match saved user_id", ->
			beforeEach ->
				@data.user_id = "not-the-saved-user-id"
				@OverleafAuthenticationController.confirmedAccountMerge(@req, @res, @next)

			it "should return a 400 invalid token error", ->
				@res.status.calledWith(400).should.equal true

	describe "showCheckAccountsPage", ->
		describe "with no token", () ->
			it "should redirect to /overleaf/login", () ->
				@req.query = {}
				@OverleafAuthenticationController.showCheckAccountsPage(@req, @res, @next)
				@res.redirect.calledWith('/overleaf/login').should.equal true

		describe "with invalid token", () ->
			beforeEach ->
				@token = "invalid-token"
				@jwt.verify = sinon.stub()
				@jwt.verify.withArgs(@token, @settings.accountMerge.secret).yields({ error: 'invalid token' })
				@req.query = token: @token
				@OverleafAuthenticationController.showCheckAccountsPage(@req, @res, @next)

			it "should return a 400 invalid token error", ->
				@res.status.calledWith(400).should.equal true

		describe "for email found in database", () ->
			beforeEach ->
				@token = "mock-token"
				@email = "found@example.com"
				@data = {
					email: @email
				}
				@jwt.verify = sinon.stub()
				@jwt.verify.withArgs(@token, @settings.accountMerge.secret).yields(null, @data)
				@User.findOne = sinon.stub().yields(null, { email: @email })
				@req.query = token: @token
				@OverleafAuthenticationController.showCheckAccountsPage(@req, @res, @next)

			it "should verify the token", () ->
				@jwt.verify
					.calledWith(@token, @settings.accountMerge.secret)
					.should.equal true

			it "should redirect to /overleaf/login", () ->
				@res.redirect.calledWith('/overleaf/login').should.equal true

		describe "for email not found in database", () ->
			beforeEach ->
				@token = "mock-token"
				@email = "not_found@example.com"
				@data = {
					email: @email
				}
				@jwt.verify = sinon.stub()
				@jwt.verify.withArgs(@token, @settings.accountMerge.secret).yields(null, @data)
				@User.findOne = sinon.stub().yields(null, null)
				@req.query = token: @token
				@OverleafAuthenticationController.showCheckAccountsPage(@req, @res, @next)

			it "should verify the token", () ->
				@jwt.verify
					.calledWith(@token, @settings.accountMerge.secret)
					.should.equal true

			it "should render the check accounts page", () ->
				@res.render.calledWith(
					Path.resolve(modulePath, "../../../views/check_accounts"),
					{ email: @email }
				).should.equal true

	describe "prepareAccountMerge", ->
		beforeEach ->
			@jwt.sign = sinon.stub().returns('some-token')

		it 'should prepare the session, and produce a url with a token', () ->
			info = {
				profile: {email: 1}
				user_id: 4
			}
			req = {session: {}}
			url = @OverleafAuthenticationController.prepareAccountMerge(info, req)
			expect(req.session.accountMerge).to.deep.equal {
				profile: {email: 1}
				user_id: 4
			}
			expect(@jwt.sign.callCount).to.equal 1
			expect(@jwt.sign.calledWith({user_id: 4, overleaf_email: 1, confirm_merge: true})).to.equal true
			expect(url.match(/^.*\/user\/confirm_account_merge\?token=some-token$/)?).to.equal true
