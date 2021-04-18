const SandboxedModule = require('sandboxed-module')
const sinon = require('sinon')
const modulePath = require('path').join(
  __dirname,
  '../../../../app/src/Features/Notifications/NotificationsBuilder'
)

describe('NotificationsBuilder', function () {
  const userId = '123nd3ijdks'

  describe('ipMatcherAffiliation', function () {
    beforeEach(function () {
      this.handler = { createNotification: sinon.stub().callsArgWith(6) }
      this.settings = { apis: { v1: { url: 'v1.url', user: '', pass: '' } } }
      this.request = sinon.stub()
      this.controller = SandboxedModule.require(modulePath, {
        requires: {
          './NotificationsHandler': this.handler,
          '@overleaf/settings': this.settings,
          request: this.request
        }
      })
    })

    describe('with portal and with SSO', function () {
      beforeEach(function () {
        this.body = {
          id: 1,
          name: 'stanford',
          enrolment_ad_html: 'v1 ad content',
          is_university: true,
          portal_slug: null,
          sso_enabled: false
        }
        this.request.callsArgWith(1, null, { statusCode: 200 }, this.body)
      })

      it('should call v1 and create affiliation notifications', function (done) {
        const ip = '192.168.0.1'
        this.controller.ipMatcherAffiliation(userId).create(ip, callback => {
          this.request.calledOnce.should.equal(true)
          const expectedOpts = {
            institutionId: this.body.id,
            university_name: this.body.name,
            content: this.body.enrolment_ad_html,
            ssoEnabled: false,
            portalPath: undefined
          }
          this.handler.createNotification
            .calledWith(
              userId,
              `ip-matched-affiliation-${this.body.id}`,
              'notification_ip_matched_affiliation',
              expectedOpts
            )
            .should.equal(true)
          done()
        })
      })
    })
    describe('without portal and without SSO', function () {
      beforeEach(function () {
        this.body = {
          id: 1,
          name: 'stanford',
          enrolment_ad_html: 'v1 ad content',
          is_university: true,
          portal_slug: 'stanford',
          sso_enabled: true
        }
        this.request.callsArgWith(1, null, { statusCode: 200 }, this.body)
      })

      it('should call v1 and create affiliation notifications', function (done) {
        const ip = '192.168.0.1'
        this.controller.ipMatcherAffiliation(userId).create(ip, callback => {
          this.request.calledOnce.should.equal(true)
          const expectedOpts = {
            institutionId: this.body.id,
            university_name: this.body.name,
            content: this.body.enrolment_ad_html,
            ssoEnabled: true,
            portalPath: '/edu/stanford'
          }
          this.handler.createNotification
            .calledWith(
              userId,
              `ip-matched-affiliation-${this.body.id}`,
              'notification_ip_matched_affiliation',
              expectedOpts
            )
            .should.equal(true)
          done()
        })
      })
    })
  })
})
