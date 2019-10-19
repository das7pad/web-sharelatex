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
  '../../../app/js/Comments/CommentsController'
)
const { expect } = require('chai')

describe('TrackChanges CommentsController', function() {
  beforeEach(function() {
    this.user_id = 'mock-user-id'
    this.settings = {}
    this.ChatApiHandler = {}
    this.EditorRealTimeController = { emitToRoom: sinon.stub() }
    this.AuthenticationController = {
      getLoggedInUserId: sinon.stub().returns(this.user_id)
    }
    this.CommentsController = SandboxedModule.require(modulePath, {
      requires: {
        'settings-sharelatex': this.settings,
        'logger-sharelatex': { log() {} },
        '../../../../../app/js/Features/Chat/ChatApiHandler': this
          .ChatApiHandler,
        '../../../../../app/js/Features/Editor/EditorRealTimeController': this
          .EditorRealTimeController,
        '../../../../../app/js/Features/Authentication/AuthenticationController': this
          .AuthenticationController,
        '../../../../../app/js/Features/User/UserInfoManager': (this.UserInfoManager = {}),
        '../../../../../app/js/Features/User/UserInfoController': (this.UserInfoController = {}),
        '../../../../../app/js/Features/DocumentUpdater/DocumentUpdaterHandler': (this.DocumentUpdaterHandler = {}),
        '../../../../../app/js/Features/Chat/ChatController': (this.ChatController = {})
      }
    })
    this.req = {}
    return (this.res = {
      json: sinon.stub(),
      sendStatus: sinon.stub()
    })
  })

  describe('sendComment', function() {
    beforeEach(function() {
      this.req.params = {
        project_id: (this.project_id = 'mock-project-id'),
        thread_id: (this.thread_id = 'mock-thread-id')
      }
      this.req.body = { content: (this.content = 'message-content') }
      this.UserInfoManager.getPersonalInfo = sinon
        .stub()
        .yields(null, (this.user = { unformatted: 'user' }))
      this.UserInfoController.formatPersonalInfo = sinon
        .stub()
        .returns((this.formatted_user = { formatted: 'user' }))
      this.ChatApiHandler.sendComment = sinon
        .stub()
        .yields(
          null,
          (this.message = { mock: 'message', user_id: this.user_id })
        )
      return this.CommentsController.sendComment(this.req, this.res)
    })

    it('should look up the user', function() {
      return this.UserInfoManager.getPersonalInfo
        .calledWith(this.user_id)
        .should.equal(true)
    })

    it('should format and inject the user into the comment', function() {
      this.UserInfoController.formatPersonalInfo
        .calledWith(this.user)
        .should.equal(true)
      return this.message.user.should.deep.equal(this.formatted_user)
    })

    it('should tell the chat handler about the message', function() {
      return this.ChatApiHandler.sendComment
        .calledWith(this.project_id, this.thread_id, this.user_id, this.content)
        .should.equal(true)
    })

    it('should tell the editor real time controller about the update with the data from the chat handler', function() {
      return this.EditorRealTimeController.emitToRoom
        .calledWith(
          this.project_id,
          'new-comment',
          this.thread_id,
          this.message
        )
        .should.equal(true)
    })

    return it('should return a 204 status code', function() {
      return this.res.sendStatus.calledWith(204).should.equal(true)
    })
  })

  describe('getThreads', function() {
    beforeEach(function() {
      this.req.params = { project_id: (this.project_id = 'mock-project-id') }
      this.ChatApiHandler.getThreads = sinon
        .stub()
        .yields(null, (this.threads = { mock: 'mock', threads: 'threads' }))
      this.ChatController._injectUserInfoIntoThreads = sinon
        .stub()
        .yields(null, this.threads)
      return this.CommentsController.getThreads(this.req, this.res)
    })

    it('should ask the chat handler about the request', function() {
      return this.ChatApiHandler.getThreads
        .calledWith(this.project_id)
        .should.equal(true)
    })

    it('should inject the user details into the threads', function() {
      return this.ChatController._injectUserInfoIntoThreads
        .calledWith(this.threads)
        .should.equal(true)
    })

    return it('should return the messages', function() {
      return this.res.json.calledWith(this.threads).should.equal(true)
    })
  })

  describe('resolveThread', function() {
    beforeEach(function() {
      this.req.params = {
        project_id: (this.project_id = 'mock-project-id'),
        thread_id: (this.thread_id = 'mock-thread-id')
      }
      this.ChatApiHandler.resolveThread = sinon.stub().yields()
      this.UserInfoManager.getPersonalInfo = sinon
        .stub()
        .yields(null, (this.user = { unformatted: 'user' }))
      this.UserInfoController.formatPersonalInfo = sinon
        .stub()
        .returns((this.formatted_user = { formatted: 'user' }))
      return this.CommentsController.resolveThread(this.req, this.res)
    })

    it('should ask the chat handler to resolve the thread', function() {
      return this.ChatApiHandler.resolveThread
        .calledWith(this.project_id, this.thread_id)
        .should.equal(true)
    })

    it('should look up the user', function() {
      return this.UserInfoManager.getPersonalInfo
        .calledWith(this.user_id)
        .should.equal(true)
    })

    it('should tell the client the comment was resolved', function() {
      return this.EditorRealTimeController.emitToRoom
        .calledWith(
          this.project_id,
          'resolve-thread',
          this.thread_id,
          this.formatted_user
        )
        .should.equal(true)
    })

    return it('should return a success code', function() {
      return this.res.sendStatus.calledWith(204).should.equal
    })
  })

  describe('reopenThread', function() {
    beforeEach(function() {
      this.req.params = {
        project_id: (this.project_id = 'mock-project-id'),
        thread_id: (this.thread_id = 'mock-thread-id')
      }
      this.ChatApiHandler.reopenThread = sinon.stub().yields()
      return this.CommentsController.reopenThread(this.req, this.res)
    })

    it('should ask the chat handler to reopen the thread', function() {
      return this.ChatApiHandler.reopenThread
        .calledWith(this.project_id, this.thread_id)
        .should.equal(true)
    })

    it('should tell the client the comment was resolved', function() {
      return this.EditorRealTimeController.emitToRoom
        .calledWith(this.project_id, 'reopen-thread', this.thread_id)
        .should.equal(true)
    })

    return it('should return a success code', function() {
      return this.res.sendStatus.calledWith(204).should.equal
    })
  })

  describe('deleteThread', function() {
    beforeEach(function() {
      this.req.params = {
        project_id: (this.project_id = 'mock-project-id'),
        doc_id: (this.doc_id = 'mock-doc-id'),
        thread_id: (this.thread_id = 'mock-thread-id')
      }
      this.DocumentUpdaterHandler.deleteThread = sinon.stub().yields()
      this.ChatApiHandler.deleteThread = sinon.stub().yields()
      return this.CommentsController.deleteThread(this.req, this.res)
    })

    it('should ask the doc udpater to delete the thread', function() {
      return this.DocumentUpdaterHandler.deleteThread
        .calledWith(this.project_id, this.doc_id, this.thread_id)
        .should.equal(true)
    })

    it('should ask the chat handler to delete the thread', function() {
      return this.ChatApiHandler.deleteThread
        .calledWith(this.project_id, this.thread_id)
        .should.equal(true)
    })

    it('should tell the client the thread was deleted', function() {
      return this.EditorRealTimeController.emitToRoom
        .calledWith(this.project_id, 'delete-thread', this.thread_id)
        .should.equal(true)
    })

    return it('should return a success code', function() {
      return this.res.sendStatus.calledWith(204).should.equal
    })
  })

  describe('editMessage', function() {
    beforeEach(function() {
      this.req.params = {
        project_id: (this.project_id = 'mock-project-id'),
        thread_id: (this.thread_id = 'mock-thread-id'),
        message_id: (this.message_id = 'mock-thread-id')
      }
      this.req.body = { content: (this.content = 'mock-content') }
      this.ChatApiHandler.editMessage = sinon.stub().yields()
      return this.CommentsController.editMessage(this.req, this.res)
    })

    it('should ask the chat handler to edit the comment', function() {
      return this.ChatApiHandler.editMessage
        .calledWith(
          this.project_id,
          this.thread_id,
          this.message_id,
          this.content
        )
        .should.equal(true)
    })

    it('should tell the client the comment was edited', function() {
      return this.EditorRealTimeController.emitToRoom
        .calledWith(
          this.project_id,
          'edit-message',
          this.thread_id,
          this.message_id,
          this.content
        )
        .should.equal(true)
    })

    return it('should return a success code', function() {
      return this.res.sendStatus.calledWith(204).should.equal
    })
  })

  return describe('deleteMessage', function() {
    beforeEach(function() {
      this.req.params = {
        project_id: (this.project_id = 'mock-project-id'),
        thread_id: (this.thread_id = 'mock-thread-id'),
        message_id: (this.message_id = 'mock-thread-id')
      }
      this.ChatApiHandler.deleteMessage = sinon.stub().yields()
      return this.CommentsController.deleteMessage(this.req, this.res)
    })

    it('should ask the chat handler to deleted the message', function() {
      return this.ChatApiHandler.deleteMessage
        .calledWith(this.project_id, this.thread_id, this.message_id)
        .should.equal(true)
    })

    it('should tell the client the message was deleted', function() {
      return this.EditorRealTimeController.emitToRoom
        .calledWith(
          this.project_id,
          'delete-message',
          this.thread_id,
          this.message_id
        )
        .should.equal(true)
    })

    return it('should return a success code', function() {
      return this.res.sendStatus.calledWith(204).should.equal
    })
  })
})
