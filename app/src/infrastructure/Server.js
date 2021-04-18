const Path = require('path')
const express = require('express')
const Settings = require('@overleaf/settings')
const logger = require('logger-sharelatex')
const metrics = require('@overleaf/metrics')
const expressLocals = require('./ExpressLocals')
const CSP = require('./CSP')
const ResourceHints = require('./ResourceHints')
const Validation = require('./Validation')
const Router = require('../router')
const helmet = require('helmet')
const UserSessionsRedis = require('../Features/User/UserSessionsRedis')
const Csrf = require('./Csrf')

const sessionsRedisClient = UserSessionsRedis.client()

const SessionAutostartMiddleware = require('./SessionAutostartMiddleware')
const SessionStoreManager = require('./SessionStoreManager')
const session = require('express-session')
const RedisStore = require('connect-redis')(session)
const bodyParser = require('./BodyParserWrapper')
const cookieParser = require('cookie-parser')

const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy

const ReferalConnect = require('../Features/Referal/ReferalConnect')
const RedirectManager = require('./RedirectManager')
const ProxyManager = require('./ProxyManager')
const translations = require('./Translations')
const Modules = require('./Modules')
const Views = require('./Views')

const ErrorController = require('../Features/Errors/ErrorController')
const HttpErrorHandler = require('../Features/Errors/HttpErrorHandler')
const UserSessionsManager = require('../Features/User/UserSessionsManager')
const AuthenticationController = require('../Features/Authentication/AuthenticationController')

// Init the session store
const sessionStore = new RedisStore({
  client: sessionsRedisClient,
  ttl: Math.floor(Settings.cookieSessionLength / 1000),
  serializer: {
    stringify(session) {
      // Omit the cookie config from the session blob in redis
      return JSON.stringify(Object.assign({}, session, { cookie: undefined }))
    },
    parse(blob) {
      const session = JSON.parse(blob)
      // rebuild the cookie config as we do not persist it into redis
      session.cookie = {
        domain: Settings.cookieDomain,
        expires: new Date(
          Date.now() + Settings.cookieSessionLength / 1000
        ).toISOString(),
        httpOnly: true,
        originalMaxAge: Settings.cookieSessionLength,
        path: '/',
        sameSite: Settings.sameSiteCookie,
        secure: Settings.secureCookie
      }
      return session
    }
  }
})
// Preserve touch
const touchSession = sessionStore.touch.bind(sessionStore)
// Do not bump the expiry in redis on every request
sessionStore.touch = false

const app = express()

const webRouter = express.Router()
const privateApiRouter = express.Router()
const publicApiRouter = express.Router()

if (Settings.behindProxy) {
  app.set('trust proxy', Settings.trustedProxyIps || true)
  /**
   * Handle the X-Original-Forwarded-For header.
   *
   * The nginx ingress sends us the contents of X-Forwarded-For it received in
   * X-Original-Forwarded-For. Express expects all proxy IPs to be in a comma
   * separated list in X-Forwarded-For.
   */
  app.use((req, res, next) => {
    if (
      req.headers['x-original-forwarded-for'] &&
      req.headers['x-forwarded-for']
    ) {
      req.headers['x-forwarded-for'] =
        req.headers['x-original-forwarded-for'] +
        ', ' +
        req.headers['x-forwarded-for']
    }
    next()
  })
}
if (Settings.exposeHostname) {
  const HOSTNAME = require('os').hostname()
  app.use((req, res, next) => {
    res.setHeader('X-Served-By', HOSTNAME)
    next()
  })
}

app.set('views', Path.join(__dirname, '/../../views'))
app.set('view engine', 'pug')

CSP(app, webRouter)
app.use(bodyParser.urlencoded({ extended: true, limit: '2mb' }))
app.use(bodyParser.json({ limit: Settings.max_json_request_size }))

app.use(metrics.http.monitor(logger))
RedirectManager.apply(webRouter)
ProxyManager.apply(publicApiRouter)

webRouter.use(cookieParser(Settings.security.sessionSecret))
SessionAutostartMiddleware.applyInitialMiddleware(webRouter)
webRouter.use(
  session({
    resave: false,
    saveUninitialized: false,
    secret: Settings.security.sessionSecret,
    proxy: Settings.behindProxy,
    cookie: {
      domain: Settings.cookieDomain,
      maxAge: Settings.cookieSessionLength, // in milliseconds, see https://github.com/expressjs/session#cookiemaxage
      secure: Settings.secureCookie,
      sameSite: Settings.sameSiteCookie
    },
    store: sessionStore,
    key: Settings.cookieName,
    rolling: true
  })
)

// patch the session store to generate a validation token for every new session
SessionStoreManager.enableValidationToken(sessionStore)
// use middleware to reject all requests with invalid tokens
webRouter.use(SessionStoreManager.validationMiddleware)

// passport
webRouter.use(passport.initialize())
webRouter.use(passport.session())

passport.use(
  new LocalStrategy(
    {
      passReqToCallback: true,
      usernameField: 'email',
      passwordField: 'password'
    },
    AuthenticationController.doPassportLogin
  )
)
passport.serializeUser(AuthenticationController.serializeUser)
passport.deserializeUser(AuthenticationController.deserializeUser)

Modules.hooks.fire('passportSetup', passport, function(err) {
  if (err != null) {
    logger.err({ err }, 'error setting up passport in modules')
  }
})

Modules.applyNonCsrfRouter(webRouter, privateApiRouter, publicApiRouter)

webRouter.csrf = new Csrf()
webRouter.use(webRouter.csrf.middleware)
webRouter.use(translations.middleware)

// Measure expiry from last top-level request, not last login or ajax request
webRouter.use(function(req, res, next) {
  // skip stub sessions
  if (!req.session || req.session.noSessionCallback) return next()

  const originalRender = res.render
  res.render = (...args) => {
    req.session.touch()
    if (AuthenticationController.isUserLoggedIn(req)) {
      // Extend the life time of the collection of users session ids
      UserSessionsManager.touch(
        AuthenticationController.getSessionUser(req),
        err => {
          if (err) {
            logger.err({ err }, 'error extending user session')
          }
        }
      )
    }

    // An empty session has a 'cookie' and 'validationToken' field.
    const [key1, key2, key3] = Object.keys(req.session)
    const sessionIsEmpty =
      key1 === 'cookie' && key2 === 'validationToken' && key3 === undefined
    if (!sessionIsEmpty) {
      // Extend the lifetime of this very session
      touchSession(req.sessionID, req.session, () => {})
    }
    originalRender.apply(res, args)
  }
  next()
})

webRouter.use(ReferalConnect.use)
expressLocals(app, webRouter)
ResourceHints(app, webRouter)

webRouter.use(SessionAutostartMiddleware.invokeCallbackMiddleware)

webRouter.use(function(req, res, next) {
  if (Settings.siteIsOpen) {
    next()
  } else if (
    AuthenticationController.getSessionUser(req) &&
    AuthenticationController.getSessionUser(req).isAdmin
  ) {
    next()
  } else {
    HttpErrorHandler.maintenance(req, res)
  }
})

webRouter.use(function(req, res, next) {
  if (Settings.editorIsOpen) {
    next()
  } else if (req.url.indexOf('/admin') === 0) {
    next()
  } else {
    HttpErrorHandler.maintenance(req, res)
  }
})

webRouter.use(AuthenticationController.validateAdmin)

// add security headers using Helmet
const noCacheMiddleware = require('nocache')()
webRouter.use(function(req, res, next) {
  const isLoggedIn = AuthenticationController.isUserLoggedIn(req)
  const isProjectPage = !!req.path.match('^/project/[a-f0-9]{24}$')
  if (isLoggedIn || isProjectPage) {
    noCacheMiddleware(req, res, next)
  } else {
    next()
  }
})
webRouter.use(
  helmet({
    // note that more headers are added by default
    dnsPrefetchControl: false,
    referrerPolicy: { policy: 'origin-when-cross-origin' },
    hsts: false
  })
)

logger.info('creating HTTP server'.yellow)
const server = require('http').createServer(app)

// provide settings for separate web and api processes
if (Settings.enabledServices.includes('api')) {
  logger.info('providing api router')
  app.use(privateApiRouter)
  app.use(Validation.errorMiddleware)
  app.use(ErrorController.handleApiError)
}

if (Settings.enabledServices.includes('web')) {
  logger.info('providing web router')

  Views.setup(app)

  app.use(publicApiRouter) // public API goes with web router for public access
  app.use(Validation.errorMiddleware)
  app.use(ErrorController.handleApiError)

  app.use(webRouter)
  app.use(Validation.errorMiddleware)
  app.use(ErrorController.handleError)

  Modules.loadViewIncludes(app)
}

metrics.injectMetricsRoute(webRouter)
metrics.injectMetricsRoute(privateApiRouter)

Router.initialize(webRouter, privateApiRouter, publicApiRouter)

module.exports = {
  app,
  server
}
