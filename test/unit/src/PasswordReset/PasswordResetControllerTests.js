const SandboxedModule = require('sandboxed-module')
const path = require('path')
const sinon = require('sinon')
const { expect } = require('chai')
const MockResponse = require('../helpers/MockResponse')

const MODULE_PATH = path.join(
  __dirname,
  '../../../../app/src/Features/PasswordReset/PasswordResetController'
)

describe('PasswordResetController', function() {
  beforeEach(function() {
    this.email = 'bob@bob.com'
    this.user_id = 'mock-user-id'
    this.token = 'my security token that was emailed to me'
    this.password = 'my new password'
    this.req = {
      body: {
        email: this.email,
        passwordResetToken: this.token,
        password: this.password
      },
      i18n: {
        translate() {}
      },
      session: {},
      query: {}
    }
    this.res = new MockResponse()

    this.settings = {}
    this.PasswordResetHandler = {
      generateAndEmailResetToken: sinon.stub(),
      setNewUserPassword: sinon.stub().yields(null, true, this.user_id)
    }
    this.RateLimiter = { addCount: sinon.stub() }
    this.UserSessionsManager = {
      revokeAllUserSessions: sinon.stub().callsArgWith(2, null)
    }
    this.AuthenticationManager = { validatePassword: sinon.stub() }
    this.UserUpdater = {
      removeReconfirmFlag: sinon.stub().callsArgWith(1, null)
    }
    this.PasswordResetController = SandboxedModule.require(MODULE_PATH, {
      globals: {
        console: console
      },
      requires: {
        'settings-sharelatex': this.settings,
        './PasswordResetHandler': this.PasswordResetHandler,
        'logger-sharelatex': {
          log() {},
          warn() {},
          error() {}
        },
        '../../infrastructure/RateLimiter': this.RateLimiter,
        '../Authentication/AuthenticationController': (this.AuthenticationController = {}),
        '../Authentication/AuthenticationManager': this.AuthenticationManager,
        '../User/UserGetter': (this.UserGetter = {}),
        '../User/UserSessionsManager': this.UserSessionsManager,
        '../User/UserUpdater': this.UserUpdater
      }
    })
  })

  describe('requestReset', function() {
    it('should error if the rate limit is hit', function(done) {
      this.PasswordResetHandler.generateAndEmailResetToken.callsArgWith(
        1,
        null,
        'primary'
      )
      this.RateLimiter.addCount.callsArgWith(1, null, false)
      this.PasswordResetController.requestReset(this.req, this.res)
      this.PasswordResetHandler.generateAndEmailResetToken
        .calledWith(this.email)
        .should.equal(false)
      this.res.statusCode.should.equal(429)
      done()
    })

    it('should tell the handler to process that email', function(done) {
      this.RateLimiter.addCount.callsArgWith(1, null, true)
      this.PasswordResetHandler.generateAndEmailResetToken.callsArgWith(
        1,
        null,
        'primary'
      )
      this.PasswordResetController.requestReset(this.req, this.res)
      this.PasswordResetHandler.generateAndEmailResetToken
        .calledWith(this.email)
        .should.equal(true)
      this.res.statusCode.should.equal(200)
      done()
    })

    it('should send a 500 if there is an error', function(done) {
      this.RateLimiter.addCount.callsArgWith(1, null, true)
      this.PasswordResetHandler.generateAndEmailResetToken.callsArgWith(
        1,
        'error'
      )
      this.PasswordResetController.requestReset(this.req, this.res)
      this.res.statusCode.should.equal(500)
      done()
    })

    it("should send a 404 if the email doesn't exist", function(done) {
      this.RateLimiter.addCount.callsArgWith(1, null, true)
      this.PasswordResetHandler.generateAndEmailResetToken.callsArgWith(
        1,
        null,
        null
      )
      this.PasswordResetController.requestReset(this.req, this.res)
      this.res.statusCode.should.equal(404)
      done()
    })

    it('should send a 404 if the email is registered as a secondard email', function(done) {
      this.RateLimiter.addCount.callsArgWith(1, null, true)
      this.PasswordResetHandler.generateAndEmailResetToken.callsArgWith(
        1,
        null,
        'secondary'
      )
      this.PasswordResetController.requestReset(this.req, this.res)
      this.res.statusCode.should.equal(404)
      done()
    })

    it('should normalize the email address', function(done) {
      this.email = '  UPperCaseEMAILWithSpacesAround@example.Com '
      this.req.body.email = this.email
      this.RateLimiter.addCount.callsArgWith(1, null, true)
      this.PasswordResetHandler.generateAndEmailResetToken.callsArgWith(
        1,
        null,
        'primary'
      )
      this.PasswordResetController.requestReset(this.req, this.res)
      this.PasswordResetHandler.generateAndEmailResetToken
        .calledWith(this.email.toLowerCase().trim())
        .should.equal(true)
      this.res.statusCode.should.equal(200)
      done()
    })
  })

  describe('setNewUserPassword', function() {
    beforeEach(function() {
      this.req.session.resetToken = this.token
    })

    it('should tell the user handler to reset the password', function(done) {
      this.res.callback = () => {
        this.res.statusCode.should.equal(200)
        this.PasswordResetHandler.setNewUserPassword
          .calledWith(this.token, this.password)
          .should.equal(true)
        done()
      }
      this.PasswordResetController.setNewUserPassword(this.req, this.res)
    })

    it('should preserve spaces in the password', function(done) {
      this.password = this.req.body.password = ' oh! clever! spaces around!   '
      this.res.sendStatus = code => {
        code.should.equal(200)
        this.PasswordResetHandler.setNewUserPassword.should.have.been.calledWith(
          this.token,
          this.password
        )
        done()
      }
      this.PasswordResetController.setNewUserPassword(this.req, this.res)
    })

    it("should send 404 if the token didn't work", function(done) {
      this.PasswordResetHandler.setNewUserPassword.yields(
        null,
        false,
        this.user_id
      )
      this.res.callback = () => {
        this.res.statusCode.should.equal(404)
        done()
      }
      this.PasswordResetController.setNewUserPassword(this.req, this.res)
    })

    it('should return 400 (Bad Request) if there is no password', function(done) {
      this.req.body.password = ''
      this.res.callback = () => {
        this.res.statusCode.should.equal(400)
        this.PasswordResetHandler.setNewUserPassword.called.should.equal(false)
        done()
      }
      this.PasswordResetController.setNewUserPassword(this.req, this.res)
    })

    it('should return 400 (Bad Request) if there is no passwordResetToken', function(done) {
      this.req.body.passwordResetToken = ''
      this.res.callback = () => {
        this.res.statusCode.should.equal(400)
        this.PasswordResetHandler.setNewUserPassword.called.should.equal(false)
        done()
      }
      this.PasswordResetController.setNewUserPassword(this.req, this.res)
    })

    it('should return 400 (Bad Request) if the password is invalid', function(done) {
      this.req.body.password = 'correct horse battery staple'
      this.AuthenticationManager.validatePassword = sinon
        .stub()
        .returns({ message: 'password contains invalid characters' })
      this.res.callback = () => {
        this.res.statusCode.should.equal(400)
        this.PasswordResetHandler.setNewUserPassword.called.should.equal(false)
        done()
      }
      this.PasswordResetController.setNewUserPassword(this.req, this.res)
    })

    it('should clear the session.resetToken', function(done) {
      this.res.callback = () => {
        this.res.statusCode.should.equal(200)
        this.req.session.should.not.have.property('resetToken')
        done()
      }
      this.PasswordResetController.setNewUserPassword(this.req, this.res)
    })

    it('should clear sessions', function(done) {
      this.res.callback = () => {
        this.UserSessionsManager.revokeAllUserSessions.callCount.should.equal(1)
        done()
      }
      this.PasswordResetController.setNewUserPassword(this.req, this.res)
    })

    it('should call removeReconfirmFlag', function(done) {
      this.res.callback = () => {
        this.UserUpdater.removeReconfirmFlag.callCount.should.equal(1)
        done()
      }
      this.PasswordResetController.setNewUserPassword(this.req, this.res)
    })

    describe('when doLoginAfterPasswordReset is set', function() {
      beforeEach(function() {
        this.UserGetter.getUser = sinon
          .stub()
          .callsArgWith(1, null, { email: 'joe@example.com' })
        this.req.session.doLoginAfterPasswordReset = 'true'
        this.res.json = sinon.stub()
        this.AuthenticationController.finishLogin = sinon.stub().yields()
        this.AuthenticationController._getRedirectFromSession = sinon
          .stub()
          .returns('/some/path')
      })

      it('should login user', function(done) {
        this.PasswordResetController.setNewUserPassword(
          this.req,
          this.res,
          err => {
            expect(err).to.not.exist
            this.AuthenticationController.finishLogin.callCount.should.equal(1)
            this.AuthenticationController.finishLogin
              .calledWith({ email: 'joe@example.com' }, this.req)
              .should.equal(true)
            done()
          }
        )
      })
    })
  })

  describe('renderSetPasswordForm', function() {
    describe('with token in query-string', function() {
      beforeEach(function() {
        this.req.query.passwordResetToken = this.token
      })

      it('should set session.resetToken and redirect', function(done) {
        this.req.session.should.not.have.property('resetToken')
        this.res.redirect = path => {
          path.should.equal('/user/password/set')
          this.req.session.resetToken.should.equal(this.token)
          done()
        }
        this.PasswordResetController.renderSetPasswordForm(this.req, this.res)
      })
    })

    describe('without a token in query-string', function() {
      describe('with token in session', function() {
        beforeEach(function() {
          this.req.session.resetToken = this.token
        })

        it('should render the page, passing the reset token', function(done) {
          this.res.render = (templatePath, options) => {
            options.passwordResetToken.should.equal(this.req.session.resetToken)
            done()
          }
          this.PasswordResetController.renderSetPasswordForm(this.req, this.res)
        })
      })

      describe('without a token in session', function() {
        it('should redirect to the reset request page', function(done) {
          this.res.redirect = path => {
            path.should.equal('/user/password/reset')
            this.req.session.should.not.have.property('resetToken')
            done()
          }
          this.PasswordResetController.renderSetPasswordForm(this.req, this.res)
        })
      })
    })
  })
})
