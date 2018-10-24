SandboxedModule = require('sandboxed-module')
assert = require('assert')
require('chai').should()
sinon = require('sinon')
modulePath = require('path').join __dirname, '../../../app/js/DropboxProjectController.js'

describe 'DropboxProjectController', ->
	beforeEach ->
		@user_id = "user-id-123"
		@AuthenticationController = 
			getLoggedInUserId:sinon.stub().returns(@user_id)
		@DropboxProjectController = SandboxedModule.require modulePath, requires:
			'./DropboxHandler': @DropboxHandler = {}
			"../../../../app/js/Features/Authentication/AuthenticationController":@AuthenticationController 
			'logger-sharelatex':
				log:->
				err:->

		@project_id = "project-id-123"
		@req = {}
		@res =
			json: sinon.stub()

	describe "getStatus", ->
		beforeEach ->
			@req.params =
				Project_id: @project_id
			@DropboxHandler.getUserRegistrationStatus = sinon.stub().callsArgWith(1, null, @status = {"mock": "status"})
			@DropboxProjectController.getStatus @req, @res

				
		it "should use user_id for status", ->
			@DropboxHandler.getUserRegistrationStatus
				.calledWith(@user_id)
				.should.equal true
				
		it "should send the status to the client", ->
			@res.json.calledWith(@status).should.equal true
