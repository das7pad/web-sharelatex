should = require('chai').should()
SandboxedModule = require('sandboxed-module')
assert = require('assert')
path = require('path')
sinon = require('sinon')
modulePath = path.join __dirname, "../../../app/js/TrackChanges/TrackChangesController"
expect = require("chai").expect

describe "TrackChanges TrackChangesController", ->
	beforeEach ->
		@TrackChangesController = SandboxedModule.require modulePath, requires:
			"settings-sharelatex": @settings
			"logger-sharelatex": log: ->
			"./RangesManager": @RangesManager = {}
			"./TrackChangesManager": @TrackChangesManager = {}
			"../../../../../app/js/Features/Editor/EditorRealTimeController": @EditorRealTimeController = {}
			'../../../../../app/js/Features/User/UserInfoController': @UserInfoController = {}
			"../../../../../app/js/Features/DocumentUpdater/DocumentUpdaterHandler": @DocumentUpdaterHandler = {}
		@req = {}
		@res =
			json: sinon.stub()
			send: sinon.stub()
		@next = sinon.stub()

	describe "setTrackChangesState", ->
		beforeEach ->
			@project_id = "mock-project-id"
			@req.params = { @project_id }
			@TrackChangesManager.setTrackChangesState = sinon.stub().yields()
			@EditorRealTimeController.emitToRoom = sinon.stub().yields()

		describe "when turning on for all users", ->
			beforeEach ->
				@req.body = { on: true }
				@TrackChangesController.setTrackChangesState @req, @res, @next

			it "should call setTrackChangesState with the state", ->
				@TrackChangesManager.setTrackChangesState
					.calledWith @project_id, true
					.should.equal true
			
			it "should emit the new state to the clients", ->
				@EditorRealTimeController.emitToRoom
					.calledWith @project_id, "toggle-track-changes", true
					.should.equal true
			
			it "should return a 204 response code", ->
				@res.send.calledWith(204).should.equal true
		
		describe "when turning on for some users", ->
			beforeEach ->
				@user_id = "aaaabbbbccccddddeeeeffff"
				@state = {}
				@state[@user_id] = true
				@req.body = { on_for: @state }
				@TrackChangesController.setTrackChangesState @req, @res, @next

			it "should call setTrackChangesState with the state", ->
				@TrackChangesManager.setTrackChangesState
					.calledWith @project_id, @state
					.should.equal true
			
			it "should emit the new state to the clients", ->
				@EditorRealTimeController.emitToRoom
					.calledWith @project_id, "toggle-track-changes", @state
					.should.equal true
			
			it "should return a 204 response code", ->
				@res.send.calledWith(204).should.equal true
		
		describe "with malformed data", ->
			it "should reject no data", ->
				@req.body = {}
				@TrackChangesController.setTrackChangesState @req, @res, @next
				@res.send.calledWith(400).should.equal true

			it "should reject non-user ids", ->
				@req.body = { on_for: { "foo": true }}
				@TrackChangesController.setTrackChangesState @req, @res, @next
				@res.send.calledWith(400).should.equal true

			it "should reject non-true values", ->
				@req.body = { on_for: { "aaaabbbbccccddddeeeeffff": "bar" }}
				@TrackChangesController.setTrackChangesState @req, @res, @next
				@res.send.calledWith(400).should.equal true

			it "should reject non-objects", ->
				@req.body = { on_for: [true] }
				@TrackChangesController.setTrackChangesState @req, @res, @next
				@res.send.calledWith(400).should.equal true

			it "should cast non-boolean values for global setting", ->
				@req.body = { on: 1 }
				@TrackChangesController.setTrackChangesState @req, @res, @next
				@TrackChangesManager.setTrackChangesState
					.calledWith @project_id, true
					.should.equal true
	