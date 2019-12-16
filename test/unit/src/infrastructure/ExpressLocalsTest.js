const { expect } = require('chai')
const sinon = require('sinon')
const SandboxedModule = require('sandboxed-module')
const Path = require('path')
const MockRequest = require('../helpers/MockRequest')
const MockResponse = require('../helpers/MockResponse')

const MODULE_PATH = Path.join(
  __dirname,
  '../../../../app/src/infrastructure/ExpressLocals.js'
)
const MANIFEST = Path.join(__dirname, '../../../../public/js/manifest.json')

describe('ExpressLocalsTests', function() {
  beforeEach(function() {
    this.settings = {
      brandPrefix: ''
    }
    this.user_id = '386010482601212345061012'

    this.manifest = {}

    this.requires = {
      'logger-sharelatex': { log: function() {} },
      'settings-sharelatex': this.settings,
      '../../../public/js/manifest.json': this.manifest,
      '../Features/Subscription/SubscriptionFormatters': {},
      '../Features/SystemMessages/SystemMessageManager': {},
      '../Features/Authentication/AuthenticationController': {
        getLoggedInUserId: sinon.stub().returns(this.user_id)
      },
      './Modules': {},
      './Features': {}
    }
    this.requires[MANIFEST] = {}

    this.webRouter = {
      use: sinon.stub()
    }
    this.privateApiRouter = {
      use: sinon.stub()
    }
    this.publicApiRouter = {
      use: sinon.stub()
    }

    this.req = new MockRequest()
    this.res = new MockResponse()
    this.res.locals = {}
    this.next = sinon.stub()

    this.require = () => {
      // needs to be delayed, there are top module level variable that depend on
      //  settings values - e.g. the availability of a cdn
      this.ExpressLocals = SandboxedModule.require(MODULE_PATH, {
        globals: {
          console,
          process: { env: { NODE_ENV: 'not_test_or_development' } }
        },
        requires: this.requires
      })
      this.ExpressLocals(
        this.webRouter,
        this.privateApiRouter,
        this.publicApiRouter
      )
    }
    this.loadMiddleware = id => {
      this.webRouter.use.args[id][0](this.req, this.res, this.next)
    }
  })

  let middlewareCounter

  describe('without a cdn', function() {
    middlewareCounter = -1
    beforeEach(function() {
      this.require()
    })
    // session
    middlewareCounter += 1
    // addSetContentDisposition
    middlewareCounter += 1
    // externalAuthenticationSystemUser + hasFeature
    middlewareCounter += 1

    describe('resource middleware', function() {
      middlewareCounter += 1
      const middlewareId = middlewareCounter

      beforeEach(function() {
        this.loadMiddleware(middlewareId)
      })
      it('should set basic functions', function() {
        expect(this.res.locals.staticPath).to.exist
        expect(this.res.locals.buildJsPath).to.exist
        expect(this.res.locals.buildCssPath).to.exist
        expect(this.res.locals.buildImgPath).to.exist
      })

      describe('resource hints', function() {
        beforeEach(function() {
          this.settings.addResourceHints = true
        })

        it('should expose the preload helpers', function() {
          expect(this.res.locals.preloadCss).to.exist
          expect(this.res.locals.preloadFont).to.exist
          expect(this.res.locals.preloadImg).to.exist
          expect(this.res.locals.preloadCommonResources).to.exist
          expect(this.res.locals.finishPreloading).to.exist
        })

        it('should not set a header when disabled', function() {
          this.settings.addResourceHints = false
          this.res.locals.preloadCommonResources()
          this.res.locals.finishPreloading()
          expect(this.res.headers).to.deep.equal({})
        })

        it('should set the header for css', function() {
          this.res.locals.preloadCss('MODIFIER-')
          this.res.locals.finishPreloading()
          expect(this.res.headers).to.deep.equal({
            Link: '</stylesheets/MODIFIER-style.css>;rel=preload;as=style'
          })
        })

        it('should set the header for images', function() {
          this.res.locals.preloadImg('/some/image.png')
          this.res.locals.finishPreloading()
          expect(this.res.headers).to.deep.equal({
            Link: '</img/some/image.png>;rel=preload;as=image'
          })
        })

        it('should set the crossorigin flag for a font', function() {
          this.res.locals.preloadFont('arbitrary')
          this.res.locals.finishPreloading()
          expect(this.res.headers).to.deep.equal({
            Link: '</font/arbitrary.woff2>;rel=preload;as=font;crossorigin'
          })
        })

        it('should inject common resources for user pages', function() {
          this.res.render('template', {})
          expect(this.res.headers.Link).to.exist
          const Link = this.res.headers.Link
          expect(Link).to.include('font/font-awesome')
          expect(Link).to.include('font/merriweather')
          expect(Link).to.include('img/sprite.png')
        })

        it('should inject default brand specific resources', function() {
          this.res.render('template', {})
          expect(this.res.headers.Link).to.exist
          const Link = this.res.headers.Link
          expect(Link).to.include('stylesheets/style')
          expect(Link).to.include('font/lato')
        })

        it('should inject sl- brand specific resources', function() {
          this.settings.brandPrefix = 'sl-'
          this.res.render('template', {})
          expect(this.res.headers.Link).to.exist
          const Link = this.res.headers.Link
          expect(Link).to.include('stylesheets/sl-style')
          expect(Link).to.include('font/open-sans')
        })
      })
    })
  })

  describe('with a cdn', function() {
    middlewareCounter = -1
    beforeEach(function() {
      this.settings.cdn = { web: { host: 'https://example.com/' } }

      this.require()
    })
    // session
    middlewareCounter += 1
    // addSetContentDisposition
    middlewareCounter += 1
    // externalAuthenticationSystemUser + hasFeature
    middlewareCounter += 1

    describe('resource middleware', function() {
      middlewareCounter += 1
      const middlewareId = middlewareCounter

      beforeEach(function() {
        this.loadMiddleware(middlewareId)
      })

      describe('resource hints', function() {
        beforeEach(function() {
          this.settings.addResourceHints = true
        })

        it('should set the header for images', function() {
          this.res.locals.preloadImg('/some/image.png')
          this.res.locals.finishPreloading()
          expect(this.res.headers).to.deep.equal({
            Link:
              '<https://example.com/img/some/image.png>;rel=preload;as=image'
          })
        })
      })
    })
  })
})
