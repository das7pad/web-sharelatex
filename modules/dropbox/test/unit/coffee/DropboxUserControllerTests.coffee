SandboxedModule = require('sandboxed-module')
assert = require('assert')
require('chai').should()
sinon = require('sinon')
modulePath = require('path').join __dirname, '../../../app/js/DropboxUserController.js'


describe 'DropboxUserController', ->

	beforeEach ->
		@user_id = "23j21lk3j1312j321jkljkl"
		@csrfToken = "wombat"
		@DropboxHandler =
			getDropboxRegisterUrl: sinon.stub()
			completeRegistration: sinon.stub()
			unlinkAccount: sinon.stub()
			setAccessToken:sinon.stub()
		@user =
			features:
				dropbox: true
		@UserGetter =
			getUser: sinon.stub().callsArgWith(1, null, @user)
		@AuthenticationController =
			getLoggedInUserId: sinon.stub().returns(@user_id)
		@Csrf =
			validateRequest: sinon.stub().callsArgWith(1, true)
		@controller = SandboxedModule.require modulePath, requires:
			'./DropboxHandler': @DropboxHandler
			'logger-sharelatex':
				log:->
				err:->
			'../../../../app/js/Features/Authentication/AuthenticationController': @AuthenticationController
			'../../../../app/js/Features/User/UserGetter': @UserGetter
			'../../../../app/js/infrastructure/Csrf': @Csrf

		@req =
			body:
				tokenInfo: "access_token=dasd&token_type=bearer&uid=myuid"
			session:
				user:
					_id: @user_id
			csrfToken: ()-> "wombat"
			headers: {}
		@res = {}

	describe "redirectUserToDropboxAuth", ->
		beforeEach ->
			@dropboxUrl = "www.dropbox.com"
			@DropboxHandler.getDropboxRegisterUrl.callsArgWith(2, null, @dropboxUrl)

		it "should call getDropboxRegisterUrl with the user id", (done)->

			@res.redirect = (redirectUrl)=>
				redirectUrl.should.equal @dropboxUrl
				sinon.assert.calledWith(@DropboxHandler.getDropboxRegisterUrl, @user_id, @csrfToken)
				done()

			@controller.redirectUserToDropboxAuth @req, @res

		it "should return 403 if the user does not have the Dropbox feature", (done) ->
			@user.features.dropbox = false

			@res.sendStatus = (status)=>
				status.should.equal 403
				done()

			@controller.redirectUserToDropboxAuth @req, @res

	describe "completeDropboxRegistration", ->
		beforeEach ->
			@DropboxHandler.setAccessToken.callsArgWith(3)

		it "should call setAccessToken with the access token", (done)->

			@res.sendStatus = (statusCode)=>
				statusCode.should.equal 200
				@DropboxHandler.setAccessToken.calledWith(@user_id,{token_type:"bearer", access_token:"dasd"}, "myuid").should.equal true
				done()

			@controller.completeDropboxRegistration @req, @res

		describe "when the CSRF token is invalid", ->
			beforeEach ->
				@Csrf.validateRequest = sinon.stub().callsArgWith(1, false)

			it "should not call setAccessToken", (done)->
				@res.sendStatus = (statusCode)=>
					sinon.assert.notCalled(@DropboxHandler.setAccessToken)
					done()

				@controller.completeDropboxRegistration @req, @res

			it "should return an authentication error", (done)->
				@res.sendStatus = (statusCode)=>
					statusCode.should.equal 403
					done()

				@controller.completeDropboxRegistration @req, @res


	describe "unlinkDropbox", ->

		beforeEach ->
			@DropboxHandler.unlinkAccount.callsArgWith(1)

		it "should call unlinkAccount with the user id", (done)->

			@res.redirect = (redirectUrl)=>
				redirectUrl.should.equal "/user/settings#dropboxSettings"
				@DropboxHandler.unlinkAccount.calledWith(@user_id).should.equal true
				done()

			@controller.unlinkDropbox @req, @res
