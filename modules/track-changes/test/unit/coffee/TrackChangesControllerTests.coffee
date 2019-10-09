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
			sendStatus: sinon.stub()
		@next = sinon.stub()

	describe "setTrackChangesState", ->
		beforeEach ->
			@project_id = "mock-project-id"
			@req.params = { @project_id }
			@TrackChangesManager.setTrackChangesState = sinon.stub().yields()
			@TrackChangesManager.getTrackChangesState = sinon.stub().yields()
			@EditorRealTimeController.emitToRoom = sinon.stub().yields()

		describe "when turning on for all users", ->
			beforeEach ->
				@req.body = { on: true }
				@TrackChangesController.setTrackChangesState @req, @res, @next

			it "should call getTrackChangesState to get the current state", ->
				@TrackChangesManager.getTrackChangesState
					.calledWith @project_id
					.should.equal true

			it "should call setTrackChangesState with the state", ->
				@TrackChangesManager.setTrackChangesState
					.calledWith @project_id, true
					.should.equal true
			
			it "should emit the new state to the clients", ->
				@EditorRealTimeController.emitToRoom
					.calledWith @project_id, "toggle-track-changes", true
					.should.equal true
			
			it "should return a 204 response code", ->
				@res.sendStatus.calledWith(204).should.equal true

		describe "when turning on for some users", ->
			beforeEach ->
				@updated_user_id = "e4b2a7ae4b2a7ae4b2a7ae4b"
				@existing_user1_id = "3a8dca4c3a8dca4c3a8dca4c"
				@existing_user2_id = "253d177253d177253d177253"

				@update = {}
				@update[@updated_user_id] = true

				@existing_state = {}
				@existing_state[@updated_user_id] = false
				@existing_state[@existing_user1_id] = true
				@existing_state[@existing_user2_id] = false
				
				@expected_state = {}
				@expected_state[@updated_user_id] = true
				@expected_state[@existing_user1_id] = true
				@expected_state[@existing_user2_id] = false

				@req.body = { on_for: @update }

				@TrackChangesManager.getTrackChangesState = sinon.stub().yields(null, @existing_state)
				@TrackChangesController.setTrackChangesState @req, @res, @next

			it "should call getTrackChangesState to get the current state", ->
				@TrackChangesManager.getTrackChangesState
					.calledWith @project_id
					.should.equal true

			it "should call setTrackChangesState with the updated state", ->
				@TrackChangesManager.setTrackChangesState
					.calledWith @project_id, @expected_state
					.should.equal true
			
			it "should emit the new state to the clients", ->
				@EditorRealTimeController.emitToRoom
					.calledWith @project_id, "toggle-track-changes", @expected_state
					.should.equal true
			
			it "should return a 204 response code", ->
				@res.sendStatus.calledWith(204).should.equal true

		describe 'when turning on for guests', ->
			describe 'for only guests', ->
				beforeEach ->
					@existing_state = true
					@expected_state = {__guests__: true}
					@req.body = {on_for_guests: true, on_for: {}}
					@TrackChangesManager.getTrackChangesState = sinon.stub().yields(null, @existing_state)
					@TrackChangesController.setTrackChangesState @req, @res, @next

				it "should call getTrackChangesState to get the current state", ->
					@TrackChangesManager.getTrackChangesState
						.calledWith @project_id
						.should.equal true

				it "should call setTrackChangesState with the updated state", ->
					@TrackChangesManager.setTrackChangesState
						.calledWith @project_id, @expected_state
						.should.equal true

				it "should emit the new state to the clients", ->
					@EditorRealTimeController.emitToRoom
						.calledWith @project_id, "toggle-track-changes", @expected_state
						.should.equal true

				it "should return a 204 response code", ->
					@res.sendStatus.calledWith(204).should.equal true

			describe 'for guests and some users', ->
				beforeEach ->
					@some_user_id = '59f0992fb1b43b0a4780b717'
					@existing_state = true
					@expected_state = {__guests__: true}
					@expected_state[@some_user_id] = true
					@req.body = {on_for: {}, on_for_guests: true}
					@req.body.on_for[@some_user_id] = true
					@TrackChangesManager.getTrackChangesState = sinon.stub().yields(null, @existing_state)
					@TrackChangesController.setTrackChangesState @req, @res, @next

				it "should call getTrackChangesState to get the current state", ->
					@TrackChangesManager.getTrackChangesState
						.calledWith @project_id
						.should.equal true

				it "should call setTrackChangesState with the updated state", ->
					@TrackChangesManager.setTrackChangesState
						.calledWith @project_id, @expected_state
						.should.equal true

				it "should emit the new state to the clients", ->
					@EditorRealTimeController.emitToRoom
						.calledWith @project_id, "toggle-track-changes", @expected_state
						.should.equal true

				it "should return a 204 response code", ->
					@res.sendStatus.calledWith(204).should.equal true

		describe "with malformed data", ->
			it "should reject no data", ->
				@req.body = {}
				@TrackChangesController.setTrackChangesState @req, @res, @next
				@res.sendStatus.calledWith(400).should.equal true

			it "should reject non-user ids", ->
				@req.body = { on_for: { "foo": true }}
				@TrackChangesController.setTrackChangesState @req, @res, @next
				@res.sendStatus.calledWith(400).should.equal true

			it "should reject non-boolean values", ->
				@req.body = { on_for: { "aaaabbbbccccddddeeeeffff": "bar" }}
				@TrackChangesController.setTrackChangesState @req, @res, @next
				@res.sendStatus.calledWith(400).should.equal true

			it "should reject non-objects", ->
				@req.body = { on_for: [true] }
				@TrackChangesController.setTrackChangesState @req, @res, @next
				@res.sendStatus.calledWith(400).should.equal true

			it "should cast non-boolean values for global setting", ->
				@req.body = { on: 1 }
				@TrackChangesController.setTrackChangesState @req, @res, @next
				@TrackChangesManager.setTrackChangesState
					.calledWith @project_id, true
					.should.equal true
	
