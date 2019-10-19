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
const sinon = require('sinon')
const chai = require('chai')
const should = chai.should()
const { expect } = chai
const modulePath = '../../../app/js/PublicRegistrationController.js'
const SandboxedModule = require('sandboxed-module')
const events = require('events')
const { ObjectId } = require('mongojs')
const assert = require('assert')

describe('PublicRegistrationController', function() {
  beforeEach(function() {
    this.user_id = '323123'

    this.user = {
      _id: this.user_id,
      save: sinon.stub().callsArgWith(0),
      ace: {}
    }

    this.UserRegistrationHandler = { registerNewUser: sinon.stub() }
    this.ReferalAllocator = { allocate: sinon.stub().yields() }
    this.UserUpdater = { changeEmailAddress: sinon.stub() }
    this.UserEmailsConfirmationHandler = {
      sendConfirmationEmail: sinon.stub().yields()
    }
    this.UserHandler = {
      populateTeamInvites: sinon
        .stub()
        .callsArgWith(1)
        .yields()
    }
    this.AuthenticationController = {
      passportLogin: sinon.stub(),
      _getRedirectFromSession: sinon.stub().returns('/somewhere'),
      _clearRedirectFromSession: sinon.stub()
    }
    this.UserSessionsManager = { trackSession: sinon.stub().yields() }
    this.AnalyticsManager = { identifyUser: sinon.stub() }
    this.PublicRegistrationController = SandboxedModule.require(modulePath, {
      requires: {
        '../../../../app/js/Features/User/UserRegistrationHandler': this
          .UserRegistrationHandler,
        '../../../../app/js/Features/Referal/ReferalAllocator': this
          .ReferalAllocator,
        '../../../../app/js/Features/Email/Layouts/PersonalEmailLayout': {},
        '../../../../app/js/Features/Email/EmailBuilder': {
          templates: { welcome: {} },
          CTAEmailTemplate: sinon.stub()
        },
        '../../../../app/js/Features/Email/EmailHandler': {},
        '../../../../app/js/Features/User/UserHandler': this.UserHandler,
        '../../../../app/js/Features/User/UserEmailsConfirmationHandler': this
          .UserEmailsConfirmationHandler,
        '../../../../app/js/Features/Authentication/AuthenticationController': this
          .AuthenticationController,
        '../../../../app/js/Features/User/UserSessionsManager': this
          .UserSessionsManager,
        '../../../../app/coffee/Features/Analytics/AnalyticsManager': this
          .AnalyticsManager,
        'logger-sharelatex': { log() {} },
        'metrics-sharelatex': { inc() {} },
        'settings-sharelatex': {}
      }
    })

    this.req = {
      session: {
        destroy() {},
        user: {
          _id: this.user_id
        }
      },
      body: {},
      login: sinon.stub().callsArgWith(1, null) // passport
    }
    this.res = { json: sinon.stub() }
    return (this.next = sinon.stub())
  })

  return describe('register', function() {
    beforeEach(function() {
      this.AuthenticationController._getRedirectFromSession = sinon
        .stub()
        .returns(null)
      return (this.req.session.passport = { user: { _id: this.user_id } })
    })

    it('should ask the UserRegistrationHandler to register user', function(done) {
      this.UserRegistrationHandler.registerNewUser.callsArgWith(
        1,
        null,
        this.user
      )
      this.res.json = () => {
        this.UserRegistrationHandler.registerNewUser
          .calledWith(this.req.body)
          .should.equal(true)
        return done()
      }
      return this.PublicRegistrationController.register(this.req, this.res)
    })

    it('should try and log the user in if there is an EmailAlreadyRegistered error', function(done) {
      this.UserRegistrationHandler.registerNewUser.callsArgWith(
        1,
        new Error('EmailAlreadyRegistered')
      )
      this.PublicRegistrationController.register(this.req, this.res, this.next)
      this.req.login.callCount.should.equal(0)
      this.req.login.calledWith(this.user).should.equal(false)
      this.AuthenticationController.passportLogin.callCount.should.equal(1)
      this.AuthenticationController.passportLogin
        .calledWith(this.req, this.res, this.next)
        .should.equal(true)
      return done()
    })

    it('should tell the user about the overleaf beta if trying to register with an existing linked overleaf email', function(done) {
      this.UserRegistrationHandler.registerNewUser.callsArgWith(
        1,
        new Error('EmailAlreadyRegistered'),
        { overleaf: { id: 'exists' } }
      )
      this.res.json = opts => {
        opts.message.text.should.equal(
          'You are already registered in ShareLaTeX through the Overleaf Beta. Please log in via Overleaf.'
        )
        return done()
      }
      return this.PublicRegistrationController.register(
        this.req,
        this.res,
        this.next
      )
    })

    it('should put the user on the session and mark them as justRegistered', function(done) {
      this.UserRegistrationHandler.registerNewUser.callsArgWith(
        1,
        null,
        this.user
      )
      this.res.json = () => {
        this.req.login.calledWith(this.user).should.equal(true)
        assert.equal(this.req.session.justRegistered, true)
        return done()
      }
      return this.PublicRegistrationController.register(this.req, this.res)
    })

    it('should redirect to project page', function(done) {
      this.UserRegistrationHandler.registerNewUser.callsArgWith(
        1,
        null,
        this.user
      )
      this.res.json = opts => {
        opts.redir.should.equal('/project')
        return done()
      }
      return this.PublicRegistrationController.register(this.req, this.res)
    })

    it('should redirect passed redir if it exists', function(done) {
      this.UserRegistrationHandler.registerNewUser.callsArgWith(
        1,
        null,
        this.user
      )
      this.AuthenticationController._getRedirectFromSession = sinon
        .stub()
        .returns('/somewhere')
      this.res.json = opts => {
        opts.redir.should.equal('/somewhere')
        return done()
      }
      return this.PublicRegistrationController.register(this.req, this.res)
    })

    it('should allocate the referals', function(done) {
      this.req.session = {
        referal_id: '23123',
        referal_source: 'email',
        referal_medium: 'bob',
        passport: { user: { _id: this.user_id } }
      }

      this.UserRegistrationHandler.registerNewUser.callsArgWith(
        1,
        null,
        this.user
      )
      this.AuthenticationController._getRedirectFromSession = sinon
        .stub()
        .returns('/somewhere')
      this.res.json = opts => {
        this.ReferalAllocator.allocate
          .calledWith(
            this.req.session.referal_id,
            this.user._id,
            this.req.session.referal_source,
            this.req.session.referal_medium
          )
          .should.equal(true)
        return done()
      }
      return this.PublicRegistrationController.register(this.req, this.res)
    })

    it('should call populateTeamInvites', function(done) {
      this.UserRegistrationHandler.registerNewUser.callsArgWith(
        1,
        null,
        this.user
      )
      this.res.json = opts => {
        this.UserHandler.populateTeamInvites
          .calledWith(this.user)
          .should.equal(true)
        return done()
      }
      return this.PublicRegistrationController.register(this.req, this.res)
    })

    return it('should send a welcome email', function(done) {
      this.UserRegistrationHandler.registerNewUser.callsArgWith(
        1,
        null,
        this.user
      )
      this.res.json = opts => {
        this.UserEmailsConfirmationHandler.sendConfirmationEmail
          .calledWith(this.user._id, this.user.email, 'welcome')
          .should.equal(true)
        return done()
      }
      return this.PublicRegistrationController.register(this.req, this.res)
    })
  })
})
