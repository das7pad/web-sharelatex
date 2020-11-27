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

describe('ExpressLocalsTests', function() {
  beforeEach(function() {
    this.settings = {
      cdn: { web: { host: '' } },
      i18n: {
        subdomainLang: {
          fr: { lngCode: 'fr', url: 'http://localhost:3000' },
          www: { lngCode: 'en', url: 'http://localhost:3000' }
        }
      }
    }
    this.user_id = '386010482601212345061012'

    const staticPath = path => this.settings.cdn.web.host + path

    this.requires = {
      './WebpackAssets': {
        buildCssPath(themeModifier) {
          return staticPath(`/stylesheets/${themeModifier}style.css`)
        },
        buildImgPath(path) {
          return staticPath('/img/' + path)
        },
        buildJsPath(name) {
          return staticPath('/js/' + name + '.js')
        },
        staticPath
      },
      'logger-sharelatex': { log: function() {} },
      '@overleaf/settings': this.settings,
      '../Features/Subscription/SubscriptionFormatters': {},
      '../Features/SystemMessages/SystemMessageManager': {},
      '../Features/Authentication/AuthenticationController': {
        getLoggedInUserId: sinon.stub().returns(this.user_id),
        getSessionUser: sinon.stub()
      },
      './Modules': {},
      './Features': { hasFeature: sinon.stub().returns(false) }
    }

    this.webRouter = {
      use: sinon.stub()
    }

    this.app = {
      locals: {}
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
          console
        },
        requires: this.requires
      })
      this.ExpressLocals(this.app, this.webRouter)
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

  describe('app.locals', function() {
    beforeEach(function() {
      this.require()
    })

    it('should set basic functions', function() {
      expect(this.app.locals.staticPath).to.exist
      expect(this.app.locals.buildJsPath).to.exist
      expect(this.app.locals.buildCssPath).to.exist
      expect(this.app.locals.buildImgPath).to.exist
    })
  })
})
