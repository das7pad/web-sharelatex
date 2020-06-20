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
      i18n: {
        subdomainLang: {
          fr: { lngCode: 'fr', url: 'http://localhost:3000' },
          www: { lngCode: 'en', url: 'http://localhost:3000' }
        }
      },
      brandPrefix: '',
      analytics: { ga: { token: '' }, gaOptimize: { id: '' } },
      saml: { ukamf: { initPath: '/' } }
    }
    this.user_id = '386010482601212345061012'

    this.requires = {
      'logger-sharelatex': { log: function() {} },
      'settings-sharelatex': this.settings,
      '../Features/Subscription/SubscriptionFormatters': {},
      '../Features/SystemMessages/SystemMessageManager': {},
      '../Features/Authentication/AuthenticationController': {
        getLoggedInUserId: sinon.stub().returns(this.user_id),
        getSessionUser: sinon.stub()
      },
      './Modules': {},
      './Features': { hasFeature: sinon.stub().returns(false) }
    }
    this.requires[MANIFEST] = {}

    this.webRouter = {
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
          process: { env: { NODE_ENV: 'test' } }
        },
        requires: this.requires
      })
      this.ExpressLocals(this.webRouter)
    }
    this.loadMiddleware = id => {
      this.webRouter.use.args[id][0](this.req, this.res, this.next)
    }
  })

  describe('without a cdn', function() {
    beforeEach(function() {
      this.require()
    })

    describe('resource middleware', function() {
      beforeEach(function() {
        this.loadMiddleware(0)
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
            Link: '</fonts/arbitrary.woff2>;rel=preload;as=font;crossorigin'
          })
        })

        it('should inject common resources for user pages', function() {
          this.res.render('template', {})
          expect(this.res.headers.Link).to.exist
          const Link = this.res.headers.Link
          expect(Link).to.include('fonts/font-awesome')
          expect(Link).to.include('fonts/merriweather')
          expect(Link).to.include('img/sprite.png')
        })

        it('should inject default brand specific resources', function() {
          this.res.render('template', {})
          expect(this.res.headers.Link).to.exist
          const Link = this.res.headers.Link
          expect(Link).to.include('stylesheets/style.css')
          expect(Link).to.include('fonts/lato')
        })

        it('should inject sl- brand specific resources', function() {
          this.settings.brandPrefix = 'sl-'
          this.res.render('template', {})
          expect(this.res.headers.Link).to.exist
          const Link = this.res.headers.Link
          expect(Link).to.include('stylesheets/sl-style.css')
          expect(Link).to.include('fonts/open-sans')
        })
      })
    })
  })

  describe('with a cdn', function() {
    beforeEach(function() {
      this.settings.cdn = { web: { host: 'https://example.com/' } }

      this.require()
    })

    describe('resource middleware', function() {
      beforeEach(function() {
        this.loadMiddleware(0)
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

  describe('with only one language', function() {
    beforeEach(function() {
      this.settings.i18n = {
        subdomainLang: {
          www: { lngCode: 'en', url: 'http://localhost:3000' }
        }
      }

      this.require()
    })

    describe('resource middleware', function() {
      beforeEach(function() {
        this.loadMiddleware(0)
      })

      describe('resource hints', function() {
        beforeEach(function() {
          this.settings.addResourceHints = true
        })

        it('should not inject the flags sprite', function() {
          this.res.render('template', {})
          expect(this.res.headers.Link).to.exist
          expect(this.res.headers.Link).to.not.include('img/sprite.png')
        })
      })
    })
  })
})
