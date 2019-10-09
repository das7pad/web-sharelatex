should = require('chai').should()
SandboxedModule = require('sandboxed-module')
assert = require('assert')
path = require('path')
sinon = require('sinon')
modulePath = path.join __dirname, "../../../app/js/Comments/CommentsController"
expect = require("chai").expect

describe "TrackChanges CommentsController", ->
	beforeEach ->
		@user_id = 'mock-user-id'
		@settings = {}
		@ChatApiHandler = {}
		@EditorRealTimeController =
			emitToRoom:sinon.stub()
		@AuthenticationController =
			getLoggedInUserId: sinon.stub().returns(@user_id)
		@CommentsController = SandboxedModule.require modulePath, requires:
			"settings-sharelatex": @settings
			"logger-sharelatex": log: ->
			"../../../../../app/js/Features/Chat/ChatApiHandler": @ChatApiHandler
			"../../../../../app/js/Features/Editor/EditorRealTimeController": @EditorRealTimeController
			'../../../../../app/js/Features/Authentication/AuthenticationController': @AuthenticationController
			'../../../../../app/js/Features/User/UserInfoManager': @UserInfoManager = {}
			'../../../../../app/js/Features/User/UserInfoController': @UserInfoController = {}
			"../../../../../app/js/Features/DocumentUpdater/DocumentUpdaterHandler": @DocumentUpdaterHandler = {}
			"../../../../../app/js/Features/Chat/ChatController": @ChatController = {}
		@req = {}
		@res =
			json: sinon.stub()
			sendStatus: sinon.stub()

	describe "sendComment", ->
		beforeEach ->
			@req.params =
				project_id: @project_id = "mock-project-id"
				thread_id: @thread_id = "mock-thread-id"
			@req.body =
				content: @content = "message-content"
			@UserInfoManager.getPersonalInfo = sinon.stub().yields(null, @user = {"unformatted": "user"})
			@UserInfoController.formatPersonalInfo = sinon.stub().returns(@formatted_user = {"formatted": "user"})
			@ChatApiHandler.sendComment = sinon.stub().yields(null, @message = {"mock": "message", user_id: @user_id})
			@CommentsController.sendComment @req, @res
		
		it "should look up the user", ->
			@UserInfoManager.getPersonalInfo
				.calledWith(@user_id)
				.should.equal true

		it "should format and inject the user into the comment", ->
			@UserInfoController.formatPersonalInfo
				.calledWith(@user)
				.should.equal true
			@message.user.should.deep.equal @formatted_user

		it "should tell the chat handler about the message", ->
			@ChatApiHandler.sendComment
				.calledWith(@project_id, @thread_id, @user_id, @content)
				.should.equal true

		it "should tell the editor real time controller about the update with the data from the chat handler", ->
			@EditorRealTimeController.emitToRoom
				.calledWith(@project_id, "new-comment", @thread_id, @message)
				.should.equal true
				
		it "should return a 204 status code", ->
			@res.sendStatus.calledWith(204).should.equal true

	describe "getThreads", ->
		beforeEach ->
			@req.params =
				project_id: @project_id = "mock-project-id"
			@ChatApiHandler.getThreads = sinon.stub().yields(null, @threads = {"mock", "threads"})
			@ChatController._injectUserInfoIntoThreads = sinon.stub().yields(null, @threads)
			@CommentsController.getThreads @req, @res

		it "should ask the chat handler about the request", ->
			@ChatApiHandler.getThreads
				.calledWith(@project_id)
				.should.equal true
			
		it "should inject the user details into the threads", ->
			@ChatController._injectUserInfoIntoThreads
				.calledWith(@threads)
				.should.equal true

		it "should return the messages", ->
			@res.json.calledWith(@threads).should.equal true

	describe "resolveThread", ->
		beforeEach ->
			@req.params =
				project_id: @project_id = "mock-project-id"
				thread_id: @thread_id = "mock-thread-id"
			@ChatApiHandler.resolveThread = sinon.stub().yields()
			@UserInfoManager.getPersonalInfo = sinon.stub().yields(null, @user = {"unformatted": "user"})
			@UserInfoController.formatPersonalInfo = sinon.stub().returns(@formatted_user = {"formatted": "user"})
			@CommentsController.resolveThread @req, @res

		it "should ask the chat handler to resolve the thread", ->
			@ChatApiHandler.resolveThread
				.calledWith(@project_id, @thread_id)
				.should.equal true
			
		it "should look up the user", ->
			@UserInfoManager.getPersonalInfo
				.calledWith(@user_id)
				.should.equal true

		it "should tell the client the comment was resolved", ->
			@EditorRealTimeController.emitToRoom
				.calledWith(@project_id, "resolve-thread", @thread_id, @formatted_user)
				.should.equal true

		it "should return a success code", ->
			@res.sendStatus.calledWith(204).should.equal

	describe "reopenThread", ->
		beforeEach ->
			@req.params =
				project_id: @project_id = "mock-project-id"
				thread_id: @thread_id = "mock-thread-id"
			@ChatApiHandler.reopenThread = sinon.stub().yields()
			@CommentsController.reopenThread @req, @res

		it "should ask the chat handler to reopen the thread", ->
			@ChatApiHandler.reopenThread
				.calledWith(@project_id, @thread_id)
				.should.equal true

		it "should tell the client the comment was resolved", ->
			@EditorRealTimeController.emitToRoom
				.calledWith(@project_id, "reopen-thread", @thread_id)
				.should.equal true

		it "should return a success code", ->
			@res.sendStatus.calledWith(204).should.equal

	describe "deleteThread", ->
		beforeEach ->
			@req.params =
				project_id: @project_id = "mock-project-id"
				doc_id: @doc_id = "mock-doc-id"
				thread_id: @thread_id = "mock-thread-id"
			@DocumentUpdaterHandler.deleteThread = sinon.stub().yields()
			@ChatApiHandler.deleteThread = sinon.stub().yields()
			@CommentsController.deleteThread @req, @res
		
		it "should ask the doc udpater to delete the thread", ->
			@DocumentUpdaterHandler.deleteThread
				.calledWith(@project_id, @doc_id, @thread_id)
				.should.equal true

		it "should ask the chat handler to delete the thread", ->
			@ChatApiHandler.deleteThread
				.calledWith(@project_id, @thread_id)
				.should.equal true

		it "should tell the client the thread was deleted", ->
			@EditorRealTimeController.emitToRoom
				.calledWith(@project_id, "delete-thread", @thread_id)
				.should.equal true

		it "should return a success code", ->
			@res.sendStatus.calledWith(204).should.equal

	describe "editMessage", ->
		beforeEach ->
			@req.params =
				project_id: @project_id = "mock-project-id"
				thread_id: @thread_id = "mock-thread-id"
				message_id: @message_id = "mock-thread-id"
			@req.body =
				content: @content = "mock-content"
			@ChatApiHandler.editMessage = sinon.stub().yields()
			@CommentsController.editMessage @req, @res

		it "should ask the chat handler to edit the comment", ->
			@ChatApiHandler.editMessage
				.calledWith(@project_id, @thread_id, @message_id, @content)
				.should.equal true

		it "should tell the client the comment was edited", ->
			@EditorRealTimeController.emitToRoom
				.calledWith(@project_id, "edit-message", @thread_id, @message_id, @content)
				.should.equal true

		it "should return a success code", ->
			@res.sendStatus.calledWith(204).should.equal

	describe "deleteMessage", ->
		beforeEach ->
			@req.params =
				project_id: @project_id = "mock-project-id"
				thread_id: @thread_id = "mock-thread-id"
				message_id: @message_id = "mock-thread-id"
			@ChatApiHandler.deleteMessage = sinon.stub().yields()
			@CommentsController.deleteMessage @req, @res

		it "should ask the chat handler to deleted the message", ->
			@ChatApiHandler.deleteMessage
				.calledWith(@project_id, @thread_id, @message_id)
				.should.equal true

		it "should tell the client the message was deleted", ->
			@EditorRealTimeController.emitToRoom
				.calledWith(@project_id, "delete-message", @thread_id, @message_id)
				.should.equal true

		it "should return a success code", ->
			@res.sendStatus.calledWith(204).should.equal
