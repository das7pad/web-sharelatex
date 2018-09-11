should = require('chai').should()
SandboxedModule = require('sandboxed-module')
assert = require('assert')
Path = require('path')
modulePath = Path.join __dirname, '../../../app/js/AccountMergeController'
sinon = require("sinon")
expect = require("chai").expect

describe "AccountMergeController", ->
	beforeEach ->
		@AccountMergeController = SandboxedModule.require modulePath, requires:
			"../../../../app/js/Features/Authentication/AuthenticationController":
				@AuthenticationController = {}
			"../../../../app/js/Features/Authentication/AuthenticationManager":
				@AuthenticationManager = {}
			"../../../../app/js/Features/Errors/ErrorController":
				@ErrorController = {}
			"logger-sharelatex": { log: sinon.stub(), err: sinon.stub() }
			"settings-sharelatex": @settings =
				accountMerge:
					betaHost: "http://beta.example.com"
					secret: "banana"
			"jsonwebtoken": @jwt = {}
			"../../../../app/js/models/User": {User: @User = {}}
			"../../../../app/js/Features/User/UserGetter": @UserGetter = {}
			"../../../../app/js/Features/Security/OneTimeTokenHandler": @OneTimeTokenHandler = {}
			"../../../../app/js/Features/Email/EmailHandler": @EmailHandler = {}
		@req = {}
		@res =
			redirect: sinon.stub()
			status: sinon.stub()
			send: sinon.stub()
			render: sinon.stub()
			json: sinon.stub()
		@res.status.returns(@res)

	describe "showConfirmAccountMerge", ->
		beforeEach ->
			@token = "mock-token"
			@user_id = "mock-user-id"
			@data = {
				confirm_merge: true
				user_id: @user_id
				overleaf_email: "jane@example.com"
			}
			@logged_in_user_id = "logged-in-user-id"
			@AuthenticationController.getLoggedInUserId =
				sinon.stub().withArgs(@req).returns(@logged_in_user_id)
			@jwt.verify = sinon.stub()
			@jwt.verify.withArgs(@token, @settings.accountMerge.secret).yields(null, @data)
			@req.query = token: @token

		describe "successfully", ->
			beforeEach ->
				@AccountMergeController.showConfirmAccountMerge(@req, @res, @next)

			it "should verify the token", ->
				@jwt.verify
					.calledWith(@token, @settings.accountMerge.secret)
					.should.equal true

			it "should render the confirmation page", ->
				@res.render
					.calledWith(
						Path.resolve(__dirname, "../../../app/views/confirm_account_merge")
						{
							logged_in_user_id: @logged_in_user_id
							merge_user_id: @data.user_id
							overleaf_email: @data.overleaf_email
							token: @token
						}
					)
					.should.equal true

		describe "with no token", ->
			beforeEach ->
				@req.query = {}
				@AccountMergeController.showConfirmAccountMerge(@req, @res, @next)

			it "should return a 400 invalid token error", ->
				@res.status.calledWith(400).should.equal true

		describe "with invalid token (no confirm_merge parameter)", ->
			beforeEach ->
				delete @data.confirm_merge
				@AccountMergeController.showConfirmAccountMerge(@req, @res, @next)

			it "should return a 400 invalid token error", ->
				@res.status.calledWith(400).should.equal true

		describe "with invalid token (no user_id parameter)", ->
			beforeEach ->
				delete @data.user_id
				@AccountMergeController.showConfirmAccountMerge(@req, @res, @next)

			it "should return a 400 invalid token error", ->
				@res.status.calledWith(400).should.equal true

		describe "with invalid token (no overleaf_email parameter)", ->
			beforeEach ->
				delete @data.overleaf_email
				@AccountMergeController.showConfirmAccountMerge(@req, @res, @next)

			it "should return a 400 invalid token error", ->
				@res.status.calledWith(400).should.equal true

	describe "confirmAccountMerge", ->
		beforeEach ->
			@token = "mock-token"
			@user_id = "mock-user-id"
			@data = {
				confirm_merge: true
				user_id: @user_id
				overleaf_email: "jane@example.com"
			}
			@logged_in_user_id = @user_id
			@AuthenticationController.getLoggedInUserId =
				sinon.stub().withArgs(@req).returns(@logged_in_user_id)
			@jwt.verify = sinon.stub()
			@jwt.verify.withArgs(@token, @settings.accountMerge.secret).yields(null, @data)
			@jwt.sign = sinon.stub().returns(@ol_token = "overleaf-token")
			@req.body = token: @token

		describe "successfully", ->
			beforeEach ->
				@AccountMergeController.confirmAccountMerge(@req, @res, @next)

			it "should verify the token", ->
				@jwt.verify
					.calledWith(@token, @settings.accountMerge.secret)
					.should.equal true

			it "should generate a new token to send back to the beta site", ->
				@jwt.sign
					.calledWith(
						{ merge_confirmed: true, user_id: @logged_in_user_id }
						@settings.accountMerge.secret
						{ expiresIn: "1h" }
					)
					.should.equal true

			it "should redirect back to the beta site", ->
				@res.json
					.calledWith({
						redir: "http://beta.example.com/overleaf/confirmed_account_merge?token=#{@ol_token}"
					})
					.should.equal true

		describe "with no token", ->
			beforeEach ->
				@req.body = {}
				@AccountMergeController.confirmAccountMerge(@req, @res, @next)

			it "should return a 400 invalid token error", ->
				@res.status.calledWith(400).should.equal true

		describe "with invalid token (no confirm_merge parameter)", ->
			beforeEach ->
				delete @data.confirm_merge
				@AccountMergeController.confirmAccountMerge(@req, @res, @next)

			it "should return a 400 invalid token error", ->
				@res.status.calledWith(400).should.equal true

		describe "with invalid token (no user_id parameter)", ->
			beforeEach ->
				delete @data.user_id
				@AccountMergeController.confirmAccountMerge(@req, @res, @next)

			it "should return a 400 invalid token error", ->
				@res.status.calledWith(400).should.equal true

		describe "with invalid token (no overleaf_email parameter)", ->
			beforeEach ->
				delete @data.overleaf_email
				@AccountMergeController.confirmAccountMerge(@req, @res, @next)

			it "should return a 400 invalid token error", ->
				@res.status.calledWith(400).should.equal true

		describe "with logged in user id doesn't match token", ->
			beforeEach ->
				@data.user_id = "not-logged-in-user-id"
				@AccountMergeController.confirmAccountMerge(@req, @res, @next)

			it "should return a 400 invalid token error", ->
				@res.status.calledWith(400).should.equal true
