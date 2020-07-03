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
  app.locals.gaToken = Settings.analytics.ga.token
  app.locals.gaOptimizeId = Settings.analytics.gaOptimize.id
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
    const currentUser = AuthenticationController.getSessionUser(req)
    res.locals.session = req.session

    res.locals.translate = function(key, vars) {
      if (vars == null) {
        vars = {}
      }
      vars.appName = Settings.appName
      return req.i18n.translate(key, vars)
    }

    res.locals.recomendSubdomain = LNG_TO_SPEC.get(req.showUserOtherLng)
    res.locals.currentLngCode = req.lng

    res.locals.getUserEmail = function() {
      return (currentUser && currentUser.email) || ''
    }

    res.locals.csrfToken = req.csrfToken()

    res.locals.getLoggedInUserId = () =>
      AuthenticationController.getLoggedInUserId(req)
    res.locals.getSessionUser = () => currentUser

    if (Settings.reloadModuleViewsOnEachRequest) {
      Modules.loadViewIncludes()
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
    webRouter.use(cspMiddleware())
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

function cspMiddleware() {
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
    const scriptSrc = ["'self'"]
    const styleSrc = ["'self'", "'unsafe-inline'"]
    const fontSrc = ["'self'", 'about:']
    const connectSrc = ["'self'"]
    const imgSrc = ["'self'", 'data:', 'blob:']
    const prefetchSrc = ["'self'"]
    const workerSrc = ["'self'"]
    const frameSrc = []

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
      workerSrc.push(cdnOrigin)
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
    let policyAmend = ''
    if (csp.reportURL) {
      policyAmend += `; report-uri ${csp.reportURL}`
    }
    return `base-uri 'self'; block-all-mixed-content; connect-src ${connectSrc.join(
      ' '
    )}; default-src 'none'; font-src ${fontSrc.join(
      ' '
    )}; form-action 'self'; frame-ancestors 'none'; frame-src ${frameSrc.join(
      ' '
    ) || "'none'"}; img-src ${imgSrc.join(
      ' '
    )}; manifest-src 'self'; prefetch-src ${prefetchSrc.join(
      ' '
    )};  script-src ${scriptSrc.join(' ')}; style-src ${styleSrc.join(
      ' '
    )}; worker-src ${workerSrc.join(' ')}${policyAmend}`
  }

  const CSP_DEFAULT = generateCSP({})
  const CSP_DASHBOARD = generateCSP({ needsFront: true })
  const CSP_EDITOR = generateCSP({
    connectCDN: true,
    needsCompilesAccess: true,
    needsSocketIo: true
  })
  const CSP_LAUNCHPAD = generateCSP({
    connectCDN: true,
    needsSocketIo: true
  })
  const CSP_SUBSCRIPTION = generateCSP({ needsRecurly: true })

  return function(req, res, next) {
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
