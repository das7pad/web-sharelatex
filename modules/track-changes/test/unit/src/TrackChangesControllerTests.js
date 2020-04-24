/* eslint-disable
    max-len,
    no-return-assign,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const should = require('chai').should()
const SandboxedModule = require('sandboxed-module')
const assert = require('assert')
const path = require('path')
const sinon = require('sinon')
const modulePath = path.join(
  __dirname,
  '../../../app/src/TrackChanges/TrackChangesController'
)
const { expect } = require('chai')

describe('TrackChanges TrackChangesController', function() {
  beforeEach(function() {
    this.TrackChangesController = SandboxedModule.require(modulePath, {
      requires: {
        'settings-sharelatex': this.settings,
        'logger-sharelatex': { log() {} },
        './RangesManager': (this.RangesManager = {}),
        './TrackChangesManager': (this.TrackChangesManager = {}),
        '../../../../../app/src/Features/Editor/EditorRealTimeController': (this.EditorRealTimeController = {}),
        '../../../../../app/src/Features/User/UserInfoController': (this.UserInfoController = {}),
        '../../../../../app/src/Features/DocumentUpdater/DocumentUpdaterHandler': (this.DocumentUpdaterHandler = {})
      }
    })
    this.req = {}
    this.res = {
      json: sinon.stub(),
      sendStatus: sinon.stub()
    }
    return (this.next = sinon.stub())
  })

  return describe('setTrackChangesState', function() {
    beforeEach(function() {
      this.project_id = 'mock-project-id'
      this.req.params = { project_id: this.project_id }
      this.TrackChangesManager.setTrackChangesState = sinon.stub().yields()
      this.TrackChangesManager.getTrackChangesState = sinon.stub().yields()
      return (this.EditorRealTimeController.emitToRoom = sinon.stub().yields())
    })

    describe('when turning on for all users', function() {
      beforeEach(function() {
        this.req.body = { on: true }
        return this.TrackChangesController.setTrackChangesState(
          this.req,
          this.res,
          this.next
        )
      })

      it('should call getTrackChangesState to get the current state', function() {
        return this.TrackChangesManager.getTrackChangesState
          .calledWith(this.project_id)
          .should.equal(true)
      })

      it('should call setTrackChangesState with the state', function() {
        return this.TrackChangesManager.setTrackChangesState
          .calledWith(this.project_id, true)
          .should.equal(true)
      })

      it('should emit the new state to the clients', function() {
        return this.EditorRealTimeController.emitToRoom
          .calledWith(this.project_id, 'toggle-track-changes', true)
          .should.equal(true)
      })

      return it('should return a 204 response code', function() {
        return this.res.sendStatus.calledWith(204).should.equal(true)
      })
    })

    describe('when turning on for some users', function() {
      beforeEach(function() {
        this.updated_user_id = 'e4b2a7ae4b2a7ae4b2a7ae4b'
        this.existing_user1_id = '3a8dca4c3a8dca4c3a8dca4c'
        this.existing_user2_id = '253d177253d177253d177253'

        this.update = {}
        this.update[this.updated_user_id] = true

        this.existing_state = {}
        this.existing_state[this.updated_user_id] = false
        this.existing_state[this.existing_user1_id] = true
        this.existing_state[this.existing_user2_id] = false

        this.expected_state = {}
        this.expected_state[this.updated_user_id] = true
        this.expected_state[this.existing_user1_id] = true
        this.expected_state[this.existing_user2_id] = false

        this.req.body = { on_for: this.update }

        this.TrackChangesManager.getTrackChangesState = sinon
          .stub()
          .yields(null, this.existing_state)
        return this.TrackChangesController.setTrackChangesState(
          this.req,
          this.res,
          this.next
        )
      })

      it('should call getTrackChangesState to get the current state', function() {
        return this.TrackChangesManager.getTrackChangesState
          .calledWith(this.project_id)
          .should.equal(true)
      })

      it('should call setTrackChangesState with the updated state', function() {
        return this.TrackChangesManager.setTrackChangesState
          .calledWith(this.project_id, this.expected_state)
          .should.equal(true)
      })

      it('should emit the new state to the clients', function() {
        return this.EditorRealTimeController.emitToRoom
          .calledWith(
            this.project_id,
            'toggle-track-changes',
            this.expected_state
          )
          .should.equal(true)
      })

      return it('should return a 204 response code', function() {
        return this.res.sendStatus.calledWith(204).should.equal(true)
      })
    })

    describe('when turning on for guests', function() {
      describe('for only guests', function() {
        beforeEach(function() {
          this.existing_state = true
          this.expected_state = { __guests__: true }
          this.req.body = { on_for_guests: true, on_for: {} }
          this.TrackChangesManager.getTrackChangesState = sinon
            .stub()
            .yields(null, this.existing_state)
          return this.TrackChangesController.setTrackChangesState(
            this.req,
            this.res,
            this.next
          )
        })

        it('should call getTrackChangesState to get the current state', function() {
          return this.TrackChangesManager.getTrackChangesState
            .calledWith(this.project_id)
            .should.equal(true)
        })

        it('should call setTrackChangesState with the updated state', function() {
          return this.TrackChangesManager.setTrackChangesState
            .calledWith(this.project_id, this.expected_state)
            .should.equal(true)
        })

        it('should emit the new state to the clients', function() {
          return this.EditorRealTimeController.emitToRoom
            .calledWith(
              this.project_id,
              'toggle-track-changes',
              this.expected_state
            )
            .should.equal(true)
        })

        return it('should return a 204 response code', function() {
          return this.res.sendStatus.calledWith(204).should.equal(true)
        })
      })

      return describe('for guests and some users', function() {
        beforeEach(function() {
          this.some_user_id = '59f0992fb1b43b0a4780b717'
          this.existing_state = true
          this.expected_state = { __guests__: true }
          this.expected_state[this.some_user_id] = true
          this.req.body = { on_for: {}, on_for_guests: true }
          this.req.body.on_for[this.some_user_id] = true
          this.TrackChangesManager.getTrackChangesState = sinon
            .stub()
            .yields(null, this.existing_state)
          return this.TrackChangesController.setTrackChangesState(
            this.req,
            this.res,
            this.next
          )
        })

        it('should call getTrackChangesState to get the current state', function() {
          return this.TrackChangesManager.getTrackChangesState
            .calledWith(this.project_id)
            .should.equal(true)
        })

        it('should call setTrackChangesState with the updated state', function() {
          return this.TrackChangesManager.setTrackChangesState
            .calledWith(this.project_id, this.expected_state)
            .should.equal(true)
        })

        it('should emit the new state to the clients', function() {
          return this.EditorRealTimeController.emitToRoom
            .calledWith(
              this.project_id,
              'toggle-track-changes',
              this.expected_state
            )
            .should.equal(true)
        })

        return it('should return a 204 response code', function() {
          return this.res.sendStatus.calledWith(204).should.equal(true)
        })
      })
    })

    return describe('with malformed data', function() {
      it('should reject no data', function() {
        this.req.body = {}
        this.TrackChangesController.setTrackChangesState(
          this.req,
          this.res,
          this.next
        )
        return this.res.sendStatus.calledWith(400).should.equal(true)
      })

      it('should reject non-user ids', function() {
        this.req.body = { on_for: { foo: true } }
        this.TrackChangesController.setTrackChangesState(
          this.req,
          this.res,
          this.next
        )
        return this.res.sendStatus.calledWith(400).should.equal(true)
      })

      it('should reject non-boolean values', function() {
        this.req.body = { on_for: { aaaabbbbccccddddeeeeffff: 'bar' } }
        this.TrackChangesController.setTrackChangesState(
          this.req,
          this.res,
          this.next
        )
        return this.res.sendStatus.calledWith(400).should.equal(true)
      })

      it('should reject non-objects', function() {
        this.req.body = { on_for: [true] }
        this.TrackChangesController.setTrackChangesState(
          this.req,
          this.res,
          this.next
        )
        return this.res.sendStatus.calledWith(400).should.equal(true)
      })

      return it('should cast non-boolean values for global setting', function() {
        this.req.body = { on: 1 }
        this.TrackChangesController.setTrackChangesState(
          this.req,
          this.res,
          this.next
        )
        return this.TrackChangesManager.setTrackChangesState
          .calledWith(this.project_id, true)
          .should.equal(true)
      })
    })
  })
})
