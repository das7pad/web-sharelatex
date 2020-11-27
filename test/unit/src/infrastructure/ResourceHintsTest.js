const { expect } = require('chai')
const sinon = require('sinon')
const SandboxedModule = require('sandboxed-module')
const Path = require('path')
const MockRequest = require('../helpers/MockRequest')
const MockResponse = require('../helpers/MockResponse')

const MODULE_PATH = Path.join(
  __dirname,
  '../../../../app/src/infrastructure/ResourceHints.js'
)

describe('ResourceHints', function() {
  beforeEach(function() {
    this.settings = {
      i18n: {
        subdomainLang: {
          fr: { lngCode: 'fr', url: 'http://localhost:3000' },
          www: { lngCode: 'en', url: 'http://localhost:3000' }
        }
      }
    }

    this.requires = {
      '@overleaf/settings': this.settings,
      './WebpackAssets': {
        buildCssPath(themeModifier) {
          return `/stylesheets/${themeModifier}style.css`
        },
        buildImgPath(path) {
          return '/img/' + path
        },
        staticPath(path) {
          return path
        }
      }
    }

    this.webRouter = {
      use: sinon.stub()
    }

    this.req = new MockRequest()
    this.res = new MockResponse()
    this.next = sinon.stub()

    this.require = () => {
      // needs to be delayed, there are top module level variable that depend on
      //  settings values - e.g. the availability of a cdn
      this.ResourceHints = SandboxedModule.require(MODULE_PATH, {
        globals: { console },
        requires: this.requires
      })
      this.ResourceHints(this.app, this.webRouter)
    }

    const getMiddlewareByName = name =>
      this.webRouter.use.args
        .map(args => args[args.length - 1])
        .filter(mw => mw.name === name)
        .pop()
    this.loadMiddleware = name => {
      this.shouldHaveLoadedMiddleware(name)
      getMiddlewareByName(name)(this.req, this.res, this.next)
    }
    this.shouldHaveLoadedMiddleware = name => {
      expect(getMiddlewareByName(name)).to.exist
    }
    this.shouldNotHaveLoadedMiddleware = name => {
      expect(getMiddlewareByName(name)).to.not.exist
    }
  })

  describe('resource hints disabled', function() {
    beforeEach(function() {
      this.settings.addResourceHints = false
      this.require()
    })

    it('should not load the preloadMiddleware', function() {
      this.shouldNotHaveLoadedMiddleware('preloadMiddleware')
    })
  })

  describe('resource hints enabled', function() {
    beforeEach(function() {
      this.settings.addResourceHints = true
      this.require()
      this.loadMiddleware('preloadMiddleware')
    })

    it('should load the preloadMiddleware', function() {
      this.shouldHaveLoadedMiddleware('preloadMiddleware')
    })

    it('should set the header for custom css', function() {
      this.req.route.path = '/Project/:Project_id'
      this.res.render('template', { themeModifier: 'light-' })
      expect(this.res.headers.Link).to.include(
        '</stylesheets/light-style.css>;rel=preload;as=style'
      )
    })

    it('should set the header for images', function() {
      this.req.route.path = '/Project/:Project_id'
      this.res.render('template', {})
      expect(this.res.headers.Link).to.include(
        '</img/ol-brand/overleaf-o.svg>;rel=preload;as=image'
      )
    })

    it('should set the crossorigin flag for a font', function() {
      this.res.render('template', {})
      expect(this.res.headers.Link).to.include(
        '.woff2>;rel=preload;as=font;crossorigin'
      )
    })

    it('should inject the tooltip font on the dashboard', function() {
      const tooltipFont = 'merriweather-v21-latin-700italic'
      this.req.route.path = '/project'
      this.res.render('template', {})
      expect(this.res.headers.Link).to.include(
        `</fonts/${tooltipFont}.woff2>;rel=preload;as=font;crossorigin`
      )
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
  })

  describe('with only one language', function() {
    beforeEach(function() {
      this.settings.i18n = {
        subdomainLang: {
          www: { lngCode: 'en', url: 'http://localhost:3000' }
        }
      }
      this.settings.addResourceHints = true
      this.require()
      this.loadMiddleware('preloadMiddleware')
    })

    it('should not inject the flags sprite', function() {
      this.res.render('template', {})
      expect(this.res.headers.Link).to.exist
      expect(this.res.headers.Link).to.not.include('img/sprite.png')
    })
  })
})
