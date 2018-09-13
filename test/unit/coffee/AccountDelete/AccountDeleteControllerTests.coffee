should = require('chai').should()
SandboxedModule = require('sandboxed-module')
assert = require('assert')
path = require('path')
modulePath = path.join __dirname, '../../../../app/js/AccountDelete/AccountDeleteController'
sinon = require("sinon")
expect = require("chai").expect


describe "AccountDeleteController", ->

	beforeEach ->
		@AccountDeleteController = SandboxedModule.require modulePath, requires:
			'./AccountDeleteHandler': @AccountDeleteHandler = {}
			'../../../../../app/js/Features/User/UserDeleter': @UserDeleter = {}
			'../../../../../app/js/Features/User/UserGetter':  @UserGetter = {}
			'../../../../../app/js/Features/User/UserSessionsManager': @UserSessionsManager = {}
			'../../../../../app/js/Features/Authentication/AuthenticationController': @AuthenticationController = {}
			'../V1Login/V1LoginHandler': @V1LoginHandler = {}
			'logger-sharelatex':
				log: sinon.stub()
				err: sinon.stub()
				warn: sinon.stub()
			'settings-sharelatex': @Settings = {}
		@user_id = 'abcd'
		@email = 'user@example.com'
		@overleaf_id = 1234

	describe 'tryDeleteUser', ->
		beforeEach ->
			@AuthenticationController.getLoggedInUserId = sinon.stub().returns @user_id
			@user =
				_id: @user_id
				email: @email
				overleaf:
					id: @overleaf_id
			@req =
				body: {password: 'password-or-whatever'}
				session: {}
			@res =
				redirect: sinon.stub()
				status: sinon.stub()
				send: sinon.stub()
				sendStatus: sinon.stub()
				json: sinon.stub()
				render: sinon.stub()
			@next = sinon.stub()

		describe 'when the user does not have an overleaf id', ->
			beforeEach ->
				delete @user.overleaf
				@UserGetter.getUser = sinon.stub().callsArgWith(2, null, @user)
				@V1LoginHandler.authWithV1 = sinon.stub()
				@next = sinon.stub()

			it 'should call next with an error', ->
				@AccountDeleteController.tryDeleteUser(@req, @res, @next)
				@next.callCount.should.equal 1
				expect(@next.lastCall.args[0]).to.be.instanceof Error
				expect(@next.lastCall.args[0].message).to.equal 'User does not have an overleaf id'
				expect(@V1LoginHandler.authWithV1.callCount).to.equal 0

		describe 'when the login fails', ->
			beforeEach ->
				@UserGetter.getUser = sinon.stub().callsArgWith(2, null, @user)
				@V1LoginHandler.authWithV1 = sinon.stub().callsArgWith(1, null, false, null)
				@AccountDeleteHandler.deleteV1Account = sinon.stub()
				@res.sendStatus = sinon.stub()

			it 'should send a 403 response', ->
				@AccountDeleteController.tryDeleteUser(@req, @res, @next)
				@res.sendStatus.callCount.should.equal 1
				@res.sendStatus.calledWith(403).should.equal true
				@AccountDeleteHandler.deleteV1Account.callCount.should.equal 0

		describe 'when the login succeeds, but the overleaf-id is different', ->
			beforeEach ->
				@UserGetter.getUser = sinon.stub().callsArgWith(2, null, @user)
				@v1Profile = {id: 9999}
				@V1LoginHandler.authWithV1 = sinon.stub().callsArgWith(1, null, true, @v1Profile)
				@AccountDeleteHandler.deleteV1Account = sinon.stub()
				@next = sinon.stub()

			it 'should call next with an error', ->
				@AccountDeleteController.tryDeleteUser(@req, @res, @next)
				@next.callCount.should.equal 1
				expect(@next.lastCall.args[0]).to.be.instanceof Error
				expect(@next.lastCall.args[0].message).to.equal 'v1 id does not match overleaf id on this account'
				expect(@AccountDeleteHandler.deleteV1Account.callCount).to.equal 0

		describe 'when the login succeeds, and all is well', ->
			beforeEach ->
				@UserGetter.getUser = sinon.stub().callsArgWith(2, null, @user)
				@v1Profile = {id: @overleaf_id}
				@V1LoginHandler.authWithV1 = sinon.stub().callsArgWith(1, null, true, @v1Profile)
				@AccountDeleteHandler.deleteV1Account = sinon.stub().callsArgWith(1, null)
				@UserDeleter.deleteUser = sinon.stub().callsArgWith(1, null)
				@req.logout = sinon.stub()
				@req.session.destroy = sinon.stub().callsArgWith(0, null)
				@UserSessionsManager.untrackSession = sinon.stub()
				@res.sendStatus = sinon.stub()

			it 'should delete the user in both v1 and here, then send a success response', ->
				@AccountDeleteController.tryDeleteUser(@req, @res, @next)
				expect(@UserGetter.getUser.callCount).to.equal 1
				expect(@V1LoginHandler.authWithV1.callCount).to.equal 1
				expect(@AccountDeleteHandler.deleteV1Account.callCount).to.equal 1
				expect(@UserDeleter.deleteUser.callCount).to.equal 1
				expect(@req.logout.callCount).to.equal 1
				expect(@req.session.destroy.callCount).to.equal 1
				expect(@UserSessionsManager.untrackSession.callCount).to.equal 1
				expect(@res.sendStatus.callCount).to.equal 1
				expect(@res.sendStatus.calledWith(200)).to.equal true
