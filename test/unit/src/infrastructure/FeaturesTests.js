const chai = require('chai')
const { expect } = chai
const modulePath = '../../../../app/src/infrastructure/Features.js'
const SandboxedModule = require('sandboxed-module')

describe('Features', function() {
  beforeEach(function() {
    this.Features = SandboxedModule.require(modulePath, {
      globals: {
        console: console
      },
      requires: {
        '@overleaf/settings': (this.settings = {})
      }
    })
  })
  describe('externalAuthenticationSystemUsed', function() {
    describe('without any settings', function() {
      it('should return false', function() {
        expect(this.Features.externalAuthenticationSystemUsed()).to.be.false
      })
    })
    describe('with ldap setting', function() {
      beforeEach(function() {
        this.settings.ldap = true
      })
      it('should return true', function() {
        expect(this.Features.externalAuthenticationSystemUsed()).to.be.true
      })
    })
    describe('with saml setting', function() {
      beforeEach(function() {
        this.settings.enableSaml = true
      })
      it('should return true', function() {
        expect(this.Features.externalAuthenticationSystemUsed()).to.be.true
      })
    })
    describe('with oauth setting', function() {
      beforeEach(function() {
        this.settings.overleaf = { oauth: true }
      })
      it('should return true', function() {
        expect(this.Features.externalAuthenticationSystemUsed()).to.be.true
      })
    })
  })

  describe('hasFeature', function() {
    const defaults = SandboxedModule.require('@overleaf/settings', {
      globals: {
        process: { env: {} }
      }
    })
    beforeEach(function() {
      Object.assign(this.settings, defaults)
    })

    describe('without any settings', function() {
      it('should return true', function() {
        expect(this.Features.hasFeature('registration')).to.be.true
        expect(this.Features.hasFeature('templates-server-pro')).to.be.true
      })
      it('should return false', function() {
        expect(this.Features.hasFeature('custom-togglers')).to.be.false
        expect(this.Features.hasFeature('oauth')).to.be.false
        expect(this.Features.hasFeature('overleaf-integration')).to.be.false
        expect(this.Features.hasFeature('references')).to.be.false
        expect(this.Features.hasFeature('affiliations')).to.be.false
        expect(this.Features.hasFeature('analytics')).to.be.false
        expect(this.Features.hasFeature('github-sync')).to.be.false
        expect(this.Features.hasFeature('git-bridge')).to.be.false
        expect(this.Features.hasFeature('homepage')).to.be.false
        expect(this.Features.hasFeature('link-url')).to.be.false
        expect(this.Features.hasFeature('saml')).to.be.false
      })
    })
    describe('with settings', function() {
      describe('empty overleaf object', function() {
        beforeEach(function() {
          this.settings.overleaf = {}
        })
        it('should return true', function() {
          expect(this.Features.hasFeature('custom-togglers')).to.be.true
          expect(this.Features.hasFeature('overleaf-integration')).to.be.true
          expect(this.Features.hasFeature('registration')).to.be.true
        })
        it('should return false', function() {
          expect(this.Features.hasFeature('oauth')).to.be.false
          expect(this.Features.hasFeature('references')).to.be.false
          expect(this.Features.hasFeature('templates-server-pro')).to.be.false
          expect(this.Features.hasFeature('affiliations')).to.be.false
          expect(this.Features.hasFeature('analytics')).to.be.false
          expect(this.Features.hasFeature('github-sync')).to.be.false
          expect(this.Features.hasFeature('git-bridge')).to.be.false
          expect(this.Features.hasFeature('homepage')).to.be.false
          expect(this.Features.hasFeature('link-url')).to.be.false
          expect(this.Features.hasFeature('saml')).to.be.false
        })
        describe('with APIs', function() {
          beforeEach(function() {
            this.settings.apis = {
              linkedUrlProxy: {
                url: 'https://www.overleaf.com'
              },
              references: {
                url: 'https://www.overleaf.com'
              },
              v1: {
                url: 'https://www.overleaf.com'
              }
            }
          })
          it('should return true', function() {
            expect(this.Features.hasFeature('affiliations')).to.be.true
            expect(this.Features.hasFeature('analytics')).to.be.true
            expect(this.Features.hasFeature('custom-togglers')).to.be.true
            expect(this.Features.hasFeature('link-url')).to.be.true
            expect(this.Features.hasFeature('overleaf-integration')).to.be.true
            expect(this.Features.hasFeature('references')).to.be.true
            expect(this.Features.hasFeature('registration')).to.be.true
          })
          it('should return false', function() {
            expect(this.Features.hasFeature('oauth')).to.be.false
            expect(this.Features.hasFeature('templates-server-pro')).to.be.false
            expect(this.Features.hasFeature('github-sync')).to.be.false
            expect(this.Features.hasFeature('git-bridge')).to.be.false
            expect(this.Features.hasFeature('homepage')).to.be.false
            expect(this.Features.hasFeature('saml')).to.be.false
          })
          describe('with all other settings flags', function() {
            beforeEach(function() {
              this.settings.enableHomepage = true
              this.settings.enableGitBridge = true
              this.settings.enableGithubSync = true
              this.settings.enableSaml = true
              this.settings.oauth = true
            })
            it('should return true', function() {
              expect(this.Features.hasFeature('affiliations')).to.be.true
              expect(this.Features.hasFeature('analytics')).to.be.true
              expect(this.Features.hasFeature('custom-togglers')).to.be.true
              expect(this.Features.hasFeature('github-sync')).to.be.true
              expect(this.Features.hasFeature('git-bridge')).to.be.true
              expect(this.Features.hasFeature('homepage')).to.be.true
              expect(this.Features.hasFeature('link-url')).to.be.true
              expect(this.Features.hasFeature('oauth')).to.be.true
              expect(this.Features.hasFeature('overleaf-integration')).to.be
                .true
              expect(this.Features.hasFeature('references')).to.be.true
              expect(this.Features.hasFeature('registration')).to.be.true
              expect(this.Features.hasFeature('saml')).to.be.true
            })
            it('should return false', function() {
              expect(this.Features.hasFeature('templates-server-pro')).to.be
                .false
            })
          })
        })
      })
    })
  })
})
