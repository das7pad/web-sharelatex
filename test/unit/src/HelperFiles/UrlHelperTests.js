const chai = require('chai')
const { expect } = chai
const SandboxedModule = require('sandboxed-module')
const modulePath = require('path').join(
  __dirname,
  '../../../../app/src/Features/Helpers/UrlHelper.js'
)

describe('UrlHelper', function () {
  beforeEach(function () {
    this.settings = {
      apis: { linkedUrlProxy: { url: undefined } },
      siteUrl: 'http://localhost:3000'
    }
    this.UrlHelper = SandboxedModule.require(modulePath, {
      requires: { 'settings-sharelatex': this.settings }
    })
  })
  describe('wrapUrlWithProxy', function () {
    const someUrl = 'https://example.com/doc.txt'

    describe('with no proxy configured', function () {
      beforeEach(function () {
        this.settings.apis.linkedUrlProxy.url = undefined
      })
      it('should throw an error', function () {
        expect(this.UrlHelper.wrapUrlWithProxy.bind(null, someUrl)).to.throw()
      })
    })

    describe('with a single proxy configured as url', function () {
      beforeEach(function () {
        this.settings.apis.linkedUrlProxy.url = 'http://proxy/proxy/abc'
      })
      it('should wrap the url', function () {
        expect(this.UrlHelper.wrapUrlWithProxy(someUrl)).to.equal(
          'http://proxy/proxy/abc?url=https%3A%2F%2Fexample.com%2Fdoc.txt'
        )
      })
    })

    describe('with a single proxy configured as chain', function () {
      beforeEach(function () {
        this.settings.apis.linkedUrlProxy.chain = ['http://proxy/proxy/abc']
      })
      it('should wrap the url', function () {
        expect(this.UrlHelper.wrapUrlWithProxy(someUrl)).to.equal(
          'http://proxy/proxy/abc?url=https%3A%2F%2Fexample.com%2Fdoc.txt'
        )
      })
    })

    describe('with a long proxy chain configured', function () {
      beforeEach(function () {
        this.settings.apis.linkedUrlProxy.chain = [
          'http://last.proxy/proxy/abc',
          'http://intermediate.proxy/proxy/abc',
          'http://first.proxy/proxy/abc'
        ]
      })
      it('should wrap the url in the correct sequence', function () {
        const proxyUrl = this.UrlHelper.wrapUrlWithProxy(someUrl)
        const last = proxyUrl.indexOf('last.proxy')
        const intermediate = proxyUrl.indexOf('intermediate.proxy')
        const first = proxyUrl.indexOf('first.proxy')

        expect(last).to.be.above(intermediate)
        expect(intermediate).to.be.above(first)
      })
    })
  })

  describe('getSafeRedirectPath', function () {
    it('sanitize redirect path to prevent open redirects', function () {
      expect(this.UrlHelper.getSafeRedirectPath('https://evil.com')).to.be
        .undefined

      expect(this.UrlHelper.getSafeRedirectPath('//evil.com')).to.be.undefined

      expect(this.UrlHelper.getSafeRedirectPath('//ol.com/evil')).to.equal(
        '/evil'
      )

      expect(this.UrlHelper.getSafeRedirectPath('////evil.com')).to.be.undefined

      expect(this.UrlHelper.getSafeRedirectPath('%2F%2Fevil.com')).to.equal(
        '/%2F%2Fevil.com'
      )

      expect(
        this.UrlHelper.getSafeRedirectPath('http://foo.com//evil.com/bad')
      ).to.equal('/evil.com/bad')

      return expect(this.UrlHelper.getSafeRedirectPath('.evil.com')).to.equal(
        '/.evil.com'
      )
    })
  })
})
