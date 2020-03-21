const sinon = require('sinon')
const assertCalledWith = sinon.assert.calledWith
const assertNotCalled = sinon.assert.notCalled
const chai = require('chai')
const { assert } = chai
const modulePath = '../../../../app/src/Features/User/UserEmailsController.js'
const SandboxedModule = require('sandboxed-module')
const MockRequest = require('../helpers/MockRequest')
const Errors = require('../../../../app/src/Features/Errors/Errors')

describe('UserEmailsController', function() {
  beforeEach(function() {
    this.req = new MockRequest()
    this.user = { _id: 'mock-user-id' }

    this.UserGetter = { getUserFullEmails: sinon.stub() }
    this.AuthenticationController = {
      getLoggedInUserId: sinon.stub().returns(this.user._id),
      setInSessionUser: sinon.stub()
    }
    this.Features = {
      hasFeature: sinon.stub()
    }
    this.UserUpdater = {
      addEmailAddress: sinon.stub(),
      removeEmailAddress: sinon.stub(),
      setDefaultEmailAddress: sinon.stub(),
      updateV1AndSetDefaultEmailAddress: sinon.stub()
    }
    this.EmailHelper = { parseEmail: sinon.stub() }
    this.endorseAffiliation = sinon.stub().yields()
    this.InstitutionsAPI = {
      endorseAffiliation: this.endorseAffiliation,
      getInstitutionViaDomain: sinon
        .stub()
        .withArgs('overleaf.com')
        .resolves({ sso_enabled: true })
        .withArgs('example.com')
        .resolves({ sso_enabled: false })
    }
    this.UserEmailsController = SandboxedModule.require(modulePath, {
      globals: {
        console: console
      },
      requires: {
        '../Authentication/AuthenticationController': this
          .AuthenticationController,
        '../../infrastructure/Features': this.Features,
        './UserGetter': this.UserGetter,
        './UserUpdater': this.UserUpdater,
        '../Helpers/EmailHelper': this.EmailHelper,
        './UserEmailsConfirmationHandler': (this.UserEmailsConfirmationHandler = {}),
        '../Institutions/InstitutionsAPI': this.InstitutionsAPI,
        '../Errors/Errors': Errors,
        'logger-sharelatex': {
          log() {
            console.log(arguments)
          },
          err() {}
        }
      }
    })
  })

  describe('List', function() {
    beforeEach(function() {})

    it('lists emails', function(done) {
      const fullEmails = [{ some: 'data' }]
      this.UserGetter.getUserFullEmails.callsArgWith(1, null, fullEmails)

      this.UserEmailsController.list(this.req, {
        json: response => {
          assert.deepEqual(response, fullEmails)
          assertCalledWith(this.UserGetter.getUserFullEmails, this.user._id)
          done()
        }
      })
    })
  })

  describe('Add', function() {
    beforeEach(function() {
      this.newEmail = 'new_email@baz.com'
      this.req.body = {
        email: this.newEmail,
        university: { name: 'University Name' },
        department: 'Department',
        role: 'Role'
      }
      this.EmailHelper.parseEmail.returns(this.newEmail)
      this.UserEmailsConfirmationHandler.sendConfirmationEmail = sinon
        .stub()
        .yields()
      this.UserUpdater.addEmailAddress.callsArgWith(3, null)
    })

    it('adds new email', function(done) {
      this.UserEmailsController.add(this.req, {
        sendStatus: code => {
          code.should.equal(204)
          assertCalledWith(this.EmailHelper.parseEmail, this.newEmail)
          assertCalledWith(
            this.UserUpdater.addEmailAddress,
            this.user._id,
            this.newEmail
          )

          const affiliationOptions = this.UserUpdater.addEmailAddress.lastCall
            .args[2]
          Object.keys(affiliationOptions).length.should.equal(3)
          affiliationOptions.university.should.equal(this.req.body.university)
          affiliationOptions.department.should.equal(this.req.body.department)
          affiliationOptions.role.should.equal(this.req.body.role)

          done()
        }
      })
    })

    it('sends an email confirmation', function(done) {
      this.UserEmailsController.add(this.req, {
        sendStatus: code => {
          code.should.equal(204)
          assertCalledWith(
            this.UserEmailsConfirmationHandler.sendConfirmationEmail,
            this.user._id,
            this.newEmail
          )
          done()
        }
      })
    })

    it('handles email parse error', function(done) {
      this.EmailHelper.parseEmail.returns(null)
      this.UserEmailsController.add(this.req, {
        sendStatus: code => {
          code.should.equal(422)
          assertNotCalled(this.UserUpdater.addEmailAddress)
          done()
        }
      })
    })
  })

  describe('remove', function() {
    beforeEach(function() {
      this.email = 'email_to_remove@bar.com'
      this.req.body.email = this.email
      this.EmailHelper.parseEmail.returns(this.email)
    })

    it('removes email', function(done) {
      this.UserUpdater.removeEmailAddress.callsArgWith(2, null)

      this.UserEmailsController.remove(this.req, {
        sendStatus: code => {
          code.should.equal(200)
          assertCalledWith(this.EmailHelper.parseEmail, this.email)
          assertCalledWith(
            this.UserUpdater.removeEmailAddress,
            this.user._id,
            this.email
          )
          done()
        }
      })
    })

    it('handles email parse error', function(done) {
      this.EmailHelper.parseEmail.returns(null)

      this.UserEmailsController.remove(this.req, {
        sendStatus: code => {
          code.should.equal(422)
          assertNotCalled(this.UserUpdater.removeEmailAddress)
          done()
        }
      })
    })
  })

  describe('setDefault', function() {
    beforeEach(function() {
      this.email = 'email_to_set_default@bar.com'
      this.req.body.email = this.email
      this.EmailHelper.parseEmail.returns(this.email)
      this.AuthenticationController.setInSessionUser.returns(null)
    })

    it('sets default email', function(done) {
      this.UserUpdater.setDefaultEmailAddress.yields()

      this.UserEmailsController.setDefault(this.req, {
        sendStatus: code => {
          code.should.equal(200)
          assertCalledWith(this.EmailHelper.parseEmail, this.email)
          assertCalledWith(
            this.AuthenticationController.setInSessionUser,
            this.req,
            { email: this.email }
          )
          assertCalledWith(
            this.UserUpdater.setDefaultEmailAddress,
            this.user._id,
            this.email
          )
          done()
        }
      })
    })

    it('handles email parse error', function(done) {
      this.EmailHelper.parseEmail.returns(null)

      this.UserEmailsController.setDefault(this.req, {
        sendStatus: code => {
          code.should.equal(422)
          assertNotCalled(this.UserUpdater.setDefaultEmailAddress)
          done()
        }
      })
    })
  })

  describe('endorse', function() {
    beforeEach(function() {
      this.email = 'email_to_endorse@bar.com'
      this.req.body.email = this.email
      this.EmailHelper.parseEmail.returns(this.email)
    })

    it('endorses affiliation', function(done) {
      this.req.body.role = 'Role'
      this.req.body.department = 'Department'

      this.UserEmailsController.endorse(this.req, {
        sendStatus: code => {
          code.should.equal(204)
          assertCalledWith(
            this.endorseAffiliation,
            this.user._id,
            this.email,
            'Role',
            'Department'
          )
          done()
        }
      })
    })
  })

  describe('confirm', function() {
    beforeEach(function() {
      this.UserEmailsConfirmationHandler.confirmEmailFromToken = sinon
        .stub()
        .yields()
      this.res = {
        sendStatus: sinon.stub(),
        json: sinon.stub()
      }
      this.res.status = sinon.stub().returns(this.res)
      this.next = sinon.stub()
      this.token = 'mock-token'
      this.req.body = { token: this.token }
    })

    describe('successfully', function() {
      beforeEach(function() {
        this.UserEmailsController.confirm(this.req, this.res, this.next)
      })

      it('should confirm the email from the token', function() {
        this.UserEmailsConfirmationHandler.confirmEmailFromToken
          .calledWith(this.token)
          .should.equal(true)
      })

      it('should return a 200 status', function() {
        this.res.sendStatus.calledWith(200).should.equal(true)
      })
    })

    describe('without a token', function() {
      beforeEach(function() {
        this.req.body.token = null
        this.UserEmailsController.confirm(this.req, this.res, this.next)
      })

      it('should return a 422 status', function() {
        this.res.status.calledWith(422).should.equal(true)
      })
    })

    describe('when confirming fails', function() {
      beforeEach(function() {
        this.UserEmailsConfirmationHandler.confirmEmailFromToken = sinon
          .stub()
          .yields(new Errors.NotFoundError('not found'))
        this.UserEmailsController.confirm(this.req, this.res, this.next)
      })

      it('should return a 404 error code with a message', function() {
        this.res.status.calledWith(404).should.equal(true)
        this.res.json
          .calledWith({
            message: this.req.i18n.translate('confirmation_token_invalid')
          })
          .should.equal(true)
      })
    })
  })
  describe('resendConfirmation', function() {
    beforeEach(function() {
      this.req = {
        body: {}
      }
      this.res = {
        sendStatus: sinon.stub()
      }
      this.next = sinon.stub()
      this.UserEmailsConfirmationHandler.sendConfirmationEmail = sinon
        .stub()
        .yields()
    })
    describe('when institution SSO is released', function() {
      beforeEach(function() {
        this.Features.hasFeature.withArgs('saml').returns(true)
      })
      describe('for an institution SSO email', function() {
        beforeEach(function() {
          this.req.body.email = 'with-sso@overleaf.com'
        })
        it('should not send the email', function() {
          this.UserEmailsController.resendConfirmation(
            this.req,
            this.res,
            () => {
              this.UserEmailsConfirmationHandler.sendConfirmationEmail.should
                .not.have.been.called.once
            }
          )
        })
      })
      describe('for a non-institution SSO email', function() {
        beforeEach(function() {
          this.req.body.email = 'without-sso@example.com'
        })
        it('should send the email', function() {
          this.UserEmailsController.resendConfirmation(
            this.req,
            this.res,
            () => {
              this.UserEmailsConfirmationHandler.sendConfirmationEmail.should
                .have.been.called.once
            }
          )
        })
      })
    })
    describe('when institution SSO is not released', function() {
      beforeEach(function() {
        this.Features.hasFeature.withArgs('saml').returns(false)
      })
      describe('for an institution SSO email', function() {
        beforeEach(function() {
          this.req.body.email = 'with-sso@overleaf.com'
        })
        it('should send the email', function() {
          this.UserEmailsController.resendConfirmation(
            this.req,
            this.res,
            () => {
              this.UserEmailsConfirmationHandler.sendConfirmationEmail.should
                .have.been.called.once
            }
          )
        })
      })
      describe('for a non-institution SSO email', function() {
        beforeEach(function() {
          this.req.body.email = 'without-sso@example.com'
        })
        it('should send the email', function() {
          this.UserEmailsController.resendConfirmation(
            this.req,
            this.res,
            () => {
              this.UserEmailsConfirmationHandler.sendConfirmationEmail.should
                .have.been.called.once
            }
          )
        })
      })
    })
  })
})
