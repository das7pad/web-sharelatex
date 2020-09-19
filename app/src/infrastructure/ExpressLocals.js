const Settings =
  require('settings-sharelatex') || require('../../../config/settings.defaults')
const { URL } = require('url')

const HAS_MULTIPLE_LANG = Object.keys(Settings.i18n.subdomainLang).length > 1
const LNG_TO_SPEC = new Map(
  Object.entries(Settings.i18n.subdomainLang).filter(entry => !entry[1].hide)
)

const Features = require('./Features')
const AuthenticationController = require('../Features/Authentication/AuthenticationController')
const Modules = require('./Modules')

let webpackManifest = {}
if (['development', 'test'].includes(process.env.NODE_ENV)) {
  webpackManifest = require('../../../public/manifest-dev.json')
} else {
  webpackManifest = require('../../../public/manifest.json')
}

const staticFilesBase = Settings.cdn.web.host.replace(/\/$/, '')

module.exports = function(app, webRouter) {
  app.locals.EXTERNAL_AUTHENTICATION_SYSTEM_USED =
    Features.EXTERNAL_AUTHENTICATION_SYSTEM_USED
  app.locals.hasFeature = Features.hasFeature
  app.locals.moduleIncludes = Modules.moduleIncludes
  app.locals.moduleIncludesAvailable = Modules.moduleIncludesAvailable
  app.locals.settings = Settings

  app.locals.buildCssPath = themeModifier =>
    staticFilesBase + webpackManifest[`${themeModifier || ''}style.css`]
  app.locals.buildImgPath = path => staticFilesBase + '/img/' + path
  app.locals.buildJsPath = path => staticFilesBase + webpackManifest[path]
  app.locals.staticPath = path => staticFilesBase + path

  webRouter.use(function(req, res, next) {
    const actualRender = res.render
    res.render = function() {
      res.locals.translate = function(key, vars) {
        vars = vars || {}
        vars.appName = Settings.appName
        return req.i18n.translate(key, vars)
      }
      res.locals.translate.has = req.i18n.translate.has
      res.locals.recomendSubdomain = LNG_TO_SPEC.get(req.showUserOtherLng)
      res.locals.currentLngCode = req.lng

      res.locals.csrfToken = req.csrfToken()

      const currentUser = AuthenticationController.getSessionUser(req)
      res.locals.getLoggedInUserId = () => currentUser && currentUser._id
      res.locals.getSessionUser = () => currentUser
      actualRender.apply(res, arguments)
    }
    next()
  })

  if (Settings.addResourceHints) {
    webRouter.use(getPreloadMiddleware(app))
  }

  if (
    Settings.security &&
    Settings.security.csp &&
    (Settings.security.csp.reportOnly || Settings.security.csp.enforce)
  ) {
    webRouter.use(getCspMiddleware())
  }
  webRouter.use('/generate/worker', function(req, res, next) {
    const workerPath = req.path
    if (workerPath.indexOf('/vendor') !== 0) {
      return res.sendStatus(404)
    }
    res.contentType('application/javascript')
    res.send(`importScripts('${staticFilesBase}${workerPath}');`)
  })
}

function getPreloadMiddleware(app) {
  function generatePreloadLink(cfg) {
    const resourceHints = []
    function preload(uri, as, crossorigin) {
      resourceHints.push({ rel: 'preload', uri, as, crossorigin })
    }
    function preloadCss(themeModifier) {
      preload(app.locals.buildCssPath(themeModifier), 'style')
    }
    function preloadFont(name) {
      // IE11 and Opera Mini are the only browsers that do not support WOFF 2.0
      //  https://caniuse.com/#search=woff2
      // They both ignore the preload header, so this is OK
      //  https://caniuse.com/#search=preload
      const uri = `${staticFilesBase}/fonts/${name}.woff2`
      preload(uri, 'font', true)
    }
    function preloadImg(path) {
      preload(app.locals.buildImgPath(path), 'image')
    }

    if (cfg.hasTooltip) {
      // additional font for the (i) tooltip
      preloadFont('merriweather-v21-latin-700italic')
    }

    if (cfg.isEditor) {
      preloadCss(cfg.themeModifier)
      preloadFont('merriweather-v21-latin-regular')
      ;['ol-brand/overleaf-o.svg', 'ol-brand/overleaf-o-grey.svg'].forEach(
        preloadImg
      )
    } else {
      preloadCss('')
      ;[
        'font-awesome-v470',
        'lato-v16-latin-ext-regular',
        'lato-v16-latin-ext-700',
        'merriweather-v21-latin-regular'
      ].forEach(preloadFont)
      if (HAS_MULTIPLE_LANG) {
        preloadImg('sprite.png')
      }
    }

    function crossorigin(resource) {
      return resource.crossorigin ? ';crossorigin' : ''
    }
    return resourceHints
      .map(r => `<${r.uri}>;rel=${r.rel};as=${r.as}${crossorigin(r)}`)
      .join(',')
  }

  const PRELOAD_DEFAULT = generatePreloadLink({})
  const PRELOAD_DASHBOARD = generatePreloadLink({ hasTooltip: true })
  const PRELOAD_EDITOR_DEFAULT = generatePreloadLink({
    isEditor: true,
    themeModifier: ''
  })
  const PRELOAD_EDITOR_IEEE = generatePreloadLink({
    isEditor: true,
    themeModifier: 'ieee-'
  })
  const PRELOAD_EDITOR_LIGHT = generatePreloadLink({
    isEditor: true,
    themeModifier: 'light-'
  })

  return function preloadMiddleware(req, res, next) {
    const actualRender = res.render
    res.render = function(view, locals, cb) {
      const endpoint = req.route.path
      let headerValue
      if (endpoint === '/project') {
        headerValue = PRELOAD_DASHBOARD
      } else if (endpoint === '/Project/:Project_id') {
        if (locals.themeModifier === 'ieee-') {
          headerValue = PRELOAD_EDITOR_IEEE
        } else if (locals.themeModifier === 'light-') {
          headerValue = PRELOAD_EDITOR_LIGHT
        } else {
          headerValue = PRELOAD_EDITOR_DEFAULT
        }
      } else {
        headerValue = PRELOAD_DEFAULT
      }
      res.setHeader('Link', headerValue)
      actualRender.call(res, view, locals, cb)
    }
    next()
  }
}

function getCspMiddleware() {
  const csp = Settings.security.csp
  const cdnOrigin = staticFilesBase.startsWith('http')
    ? new URL(staticFilesBase).origin
    : undefined
  const compilesOrigin = Settings.pdfDownloadDomain
    ? new URL(Settings.pdfDownloadDomain).origin
    : undefined
  const sentryOrigin = Settings.sentry.frontend.dsn
    ? new URL(Settings.sentry.frontend.dsn).origin
    : undefined

  const uniqueWsUrlOrigins = Array.from(
    new Set(
      [Settings.wsUrl, Settings.wsUrlBeta, Settings.wsUrlV2]
        .filter(Boolean)
        .map(url => new URL(url, Settings.siteUrl).origin)
    )
  )

  function generateCSP(cfg) {
    const SELF = "'self'"
    const baseUri = [SELF]
    const connectSrc = [SELF]
    const defaultSrc = []
    const fontSrc = [SELF, 'about:']
    const formAction = [SELF]
    const frameAncestors = []
    const frameSrc = []
    const imgSrc = [SELF, 'data:', 'blob:']
    const manifestSrc = []
    const prefetchSrc = []
    const scriptSrc = [SELF]
    const styleSrc = [SELF, "'unsafe-inline'"]
    const workerSrc = [SELF]

    if (sentryOrigin) {
      connectSrc.push(sentryOrigin)
    }

    if (Settings.analytics.ga.token) {
      // NOT TESTED -- needs nonce for i-s-o-g-r-a-m
      // https://developers.google.com/tag-manager/web/csp
      ;[connectSrc, imgSrc, scriptSrc].forEach(src =>
        src.push('https://www.google-analytics.com')
      )
      scriptSrc.push('https://ssl.google-analytics.com')
    }

    if (Settings.recaptcha && Settings.recaptcha.siteKeyV3) {
      // NOT TESTED
      frameSrc.push('https://www.google.com/recaptcha')
      imgSrc.push('https://www.gstatic.com/recaptcha')
      scriptSrc.push('https://www.google.com/recaptcha')
    }

    if (
      cfg.needsFront &&
      Settings.overleaf &&
      Settings.overleaf.front_chat_widget_room_id
    ) {
      // NOT TESTED
      // very broad addition, but I do not have any token at hand for testing.
      ;[connectSrc, fontSrc, imgSrc, scriptSrc, styleSrc].forEach(src =>
        src.push('frontapp.com', '*.frontapp.com')
      )
      connectSrc.push(
        'pusher.com',
        '*.pusher.com',
        'pusherapp.com',
        '*.pusherapp.com',
        '*.bugsnag.com'
      )
      fontSrc.push('fonts.googleapis.com')
    }

    if (cdnOrigin) {
      if (cfg.connectCDN) {
        // e.g. pdfjs cmaps or /launchpad for ide blob check
        connectSrc.push(cdnOrigin)
      }
      // assets
      fontSrc.push(cdnOrigin)
      imgSrc.push(cdnOrigin)
      prefetchSrc.push(cdnOrigin)
      scriptSrc.push(cdnOrigin)
      styleSrc.push(cdnOrigin)
    }

    if (cfg.needsCompilesAccess && compilesOrigin) {
      connectSrc.push(compilesOrigin)
    }

    if (cfg.needsSocketIo) {
      uniqueWsUrlOrigins.map(wsUrl => {
        scriptSrc.push(wsUrl)
        connectSrc.push(wsUrl)
        // websocket support: http:// -> ws:// and https:// -> wss://
        connectSrc.push('ws' + wsUrl.slice(4))
      })
    }

    if (cfg.needsPrefetch) {
      // backwards compatibility
      defaultSrc.push(...prefetchSrc)
    } else {
      prefetchSrc.length = 0
    }

    let policyAmend = ['block-all-mixed-content']
    if (csp.reportURL) {
      policyAmend.push(`report-uri ${csp.reportURL}`)
    }
    return Object.entries({
      'base-uri': baseUri,
      'connect-src': connectSrc,
      'default-src': defaultSrc,
      'font-src': fontSrc,
      'form-action': formAction,
      'frame-ancestors': frameAncestors,
      'frame-src': frameSrc,
      'img-src': imgSrc,
      'manifest-src': manifestSrc,
      'prefetch-src': prefetchSrc,
      'script-src': scriptSrc,
      'style-src': styleSrc,
      'worker-src': workerSrc
    })
      .map(([directive, origins]) => {
        return `${directive} ${origins.join(' ') || "'none'"}`
      })
      .concat(policyAmend)
      .join('; ')
  }

  const CSP_DEFAULT = generateCSP({})
  const CSP_DASHBOARD = generateCSP({ needsFront: true })
  const CSP_EDITOR = generateCSP({
    connectCDN: true,
    needsCompilesAccess: true,
    needsPrefetch: true,
    needsSocketIo: true
  })
  const CSP_LAUNCHPAD = generateCSP({
    connectCDN: true,
    needsSocketIo: true
  })
  const CSP_SUBSCRIPTION = generateCSP({ needsRecurly: true })

  return function cspMiddleware(req, res, next) {
    const actualRender = res.render
    res.render = function() {
      const endpoint = req.route.path
      let headerValue
      if (endpoint === '/project') {
        headerValue = CSP_DASHBOARD
      } else if (endpoint === '/Project/:Project_id') {
        headerValue = CSP_EDITOR
      } else if (
        endpoint === '/user/subscription/new' ||
        endpoint === '/user/subscription'
      ) {
        headerValue = CSP_SUBSCRIPTION
      } else if (endpoint === '/launchpad') {
        headerValue = CSP_LAUNCHPAD
      } else {
        headerValue = CSP_DEFAULT
      }
      if (csp.enforce) {
        res.setHeader('Content-Security-Policy', headerValue)
      } else {
        res.setHeader('Content-Security-Policy-Report-Only', headerValue)
      }
      actualRender.apply(res, arguments)
    }
    next()
  }
}
