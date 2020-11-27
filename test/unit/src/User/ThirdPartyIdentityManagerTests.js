const sinon = require('sinon')
const chai = require('chai')
const { expect } = chai
const SandboxedModule = require('sandboxed-module')
const modulePath =
  '../../../../app/src/Features/User/ThirdPartyIdentityManager.js'

describe('ThirdPartyIdentityManager', function() {
  beforeEach(function() {
    this.userId = 'a1b2c3'
    this.user = {
      _id: this.userId,
      email: 'example@overleaf.com'
    }
    this.externalUserId = 'id789'
    this.externalData = {}
    this.auditLog = { initiatorId: this.userId, ipAddress: '0:0:0:0' }
    this.ThirdPartyIdentityManager = SandboxedModule.require(modulePath, {
      globals: {
        console: console
      },
      requires: {
        '../../../../app/src/Features/User/UserAuditLogHandler': (this.UserAuditLogHandler = {
          addEntry: sinon.stub().yields()
        }),
        '../../../../app/src/Features/Email/EmailHandler': (this.EmailHandler = {
          sendEmail: sinon.stub().yields()
        }),
        'logger-sharelatex': (this.logger = {
          error: sinon.stub()
        }),
        '../../../../app/src/models/User': {
          User: (this.User = {
            findOneAndUpdate: sinon.stub().yields(undefined, this.user),
            findOne: sinon.stub()
          })
        },
        '@overleaf/settings': {
          oauthProviders: {
            google: {
              name: 'Google'
            },
            orcid: {
              name: 'Orcid'
            }
          }
        }
      }
    })
  })
  describe('link', function() {
    it('should send email alert', async function() {
      await this.ThirdPartyIdentityManager.promises.link(
        this.userId,
        'google',
        this.externalUserId,
        this.externalData,
        this.auditLog
      )
      const emailCall = this.EmailHandler.sendEmail.getCall(0)
      expect(emailCall.args[0]).to.equal('securityAlert')
      expect(emailCall.args[1].actionDescribed).to.contain(
        'a Google account was linked'
      )
    })

    it('should update user audit log', async function() {
      await this.ThirdPartyIdentityManager.promises.link(
        this.userId,
        'google',
        this.externalUserId,
        this.externalData,
        this.auditLog
      )
      expect(this.UserAuditLogHandler.addEntry).to.have.been.calledOnceWith(
        this.userId,
        'link-sso',
        this.auditLog.initiatorId,
        this.auditLog.ipAddress,
        {
          providerId: 'google'
        }
      )
    })
    describe('errors', function() {
      const anError = new Error('oops')
      it('should not unlink if the UserAuditLogHandler throws an error', function(done) {
        this.UserAuditLogHandler.addEntry.yields(anError)
        this.ThirdPartyIdentityManager.link(
          this.userId,
          'google',
          this.externalUserId,
          this.externalData,
          this.auditLog,
          error => {
            expect(error).to.exist
            expect(error).to.equal(anError)
            expect(this.User.findOneAndUpdate).to.not.have.been.called
            done()
          }
        )
      })
      describe('EmailHandler', function() {
        beforeEach(function() {
          this.EmailHandler.sendEmail.yields(anError)
        })
        it('should log but not return the error', function(done) {
          this.ThirdPartyIdentityManager.link(
            this.userId,
            'google',
            this.externalUserId,
            this.externalData,
            this.auditLog,
            error => {
              expect(error).to.not.exist
              expect(this.logger.error.lastCall).to.be.calledWithExactly(
                {
                  err: anError,
                  userId: this.userId
                },
                'could not send security alert email when Google account linked'
              )
              done()
            }
          )
        })
      })
    })
  })
  describe('unlink', function() {
    it('should send email alert', async function() {
      await this.ThirdPartyIdentityManager.promises.unlink(
        this.userId,
        'orcid',
        this.auditLog
      )
      const emailCall = this.EmailHandler.sendEmail.getCall(0)
      expect(emailCall.args[0]).to.equal('securityAlert')
      expect(emailCall.args[1].actionDescribed).to.contain(
        'an Orcid account was unlinked from'
      )
    })
    it('should update user audit log', async function() {
      await this.ThirdPartyIdentityManager.promises.unlink(
        this.userId,
        'orcid',
        this.auditLog
      )
      expect(this.UserAuditLogHandler.addEntry).to.have.been.calledOnceWith(
        this.userId,
        'unlink-sso',
        this.auditLog.initiatorId,
        this.auditLog.ipAddress,
        {
          providerId: 'orcid'
        }
      )
    })
    describe('errors', function() {
      const anError = new Error('oops')
      it('should not unlink if the UserAuditLogHandler throws an error', function(done) {
        this.UserAuditLogHandler.addEntry.yields(anError)
        this.ThirdPartyIdentityManager.unlink(
          this.userId,
          'orcid',
          this.auditLog,
          error => {
            expect(error).to.exist
            expect(error).to.equal(anError)
            expect(this.User.findOneAndUpdate).to.not.have.been.called
            done()
          }
        )
        expect(this.User.findOneAndUpdate).to.not.have.been.called
      })
      describe('EmailHandler', function() {
        beforeEach(function() {
          this.EmailHandler.sendEmail.yields(anError)
        })
        it('should log but not return the error', function(done) {
          this.ThirdPartyIdentityManager.unlink(
            this.userId,
            'google',
            this.auditLog,
            error => {
              expect(error).to.not.exist
              expect(this.logger.error.lastCall).to.be.calledWithExactly(
                {
                  err: anError,
                  userId: this.userId
                },
                'could not send security alert email when Google account no longer linked'
              )
              done()
            }
          )
        })
      })
    })
  })
})
