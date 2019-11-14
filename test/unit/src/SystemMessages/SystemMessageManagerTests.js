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
const SandboxedModule = require('sandboxed-module')
const assert = require('assert')
const should = require('chai').should()
const sinon = require('sinon')
const modulePath = require('path').join(
  __dirname,
  '../../../../app/src/Features/SystemMessages/SystemMessageManager'
)

describe('SystemMessageManager', function() {
  beforeEach(function() {
    this.SystemMessage = {}
    this.SystemMessageManager = SandboxedModule.require(modulePath, {
      globals: {
        process: process,
        console: console
      },
      requires: {
        '../../models/SystemMessage': { SystemMessage: this.SystemMessage }
      }
    })
    return (this.callback = sinon.stub())
  })

  describe('getMessage', function() {
    beforeEach(function() {
      this.messages = ['messages-stub']
      return (this.SystemMessage.find = sinon
        .stub()
        .callsArgWith(1, null, this.messages))
    })

    describe('when the messages are not cached', function() {
      beforeEach(function(done) {
        this.SystemMessageManager.getMessages(this.callback)
        process.nextTick(done)
      })

      it('should look the messages up in the database', function() {
        return this.SystemMessage.find.calledWith({}).should.equal(true)
      })

      it('should return the messages', function() {
        return this.callback.calledWith(null, this.messages).should.equal(true)
      })

      it('should cache the messages', function() {
        return this.SystemMessageManager._cachedMessages.should.equal(
          this.messages
        )
      })
    })

    describe('when the messages are cached', function() {
      beforeEach(function() {
        this.SystemMessageManager._cachedMessages = this.messages
        return this.SystemMessageManager.getMessages(this.callback)
      })

      it('should not look the messages up in the database', function() {
        return this.SystemMessage.find.called.should.equal(false)
      })

      it('should return the messages', function() {
        return this.callback.calledWith(null, this.messages).should.equal(true)
      })
    })

    describe('with many requests inflight', function() {
      beforeEach(function() {
        this.SystemMessage.find = sinon.stub()
        for (let i of Array.from({ length: 100 })) {
          this.SystemMessageManager.getMessages()
        }
      })

      it('should send only one database request', function() {
        this.SystemMessage.find.callCount.should.equal(1)
      })
    })

    describe('with a db error', function() {
      beforeEach(function() {
        this.SystemMessage.find = sinon
          .stub()
          .callsArgWith(1, new Error('db error'))
      })

      it('should fail gracefully', function(done) {
        this.SystemMessageManager.getMessages(error => {
          error.should.exist
          done()
        })
      })

      it('should not cache the failure state', function(done) {
        this.SystemMessageManager.getMessages(() => {
          should.not.exist(this.SystemMessageManager._cachedMessages)
          done()
        })
      })
    })
  })

  describe('clearMessages', function() {
    beforeEach(function() {
      this.SystemMessage.remove = sinon.stub().callsArg(1)
      return this.SystemMessageManager.clearMessages(this.callback)
    })

    it('should remove the messages from the database', function() {
      return this.SystemMessage.remove.calledWith({}).should.equal(true)
    })

    it('should return the callback', function() {
      return this.callback.called.should.equal(true)
    })
  })
})
