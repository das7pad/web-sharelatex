const Settings =
  require('settings-sharelatex') || require('../../../config/settings.defaults')
const _ = require('lodash')
const { URL } = require('url')
const Path = require('path')
const moment = require('moment')

const IS_DEV_ENV = ['development', 'test'].includes(process.env.NODE_ENV)
const HAS_MULTIPLE_LANG = Object.keys(Settings.i18n.subdomainLang).length > 1
const LNG_TO_SPEC = new Map(
  Object.entries(Settings.i18n.subdomainLang).filter(entry => !entry[1].hide)
)

const Features = require('./Features')
const AuthenticationController = require('../Features/Authentication/AuthenticationController')
const Modules = require('./Modules')
const StringHelper = require('../Features/Helpers/StringHelper')

let webpackManifest = {}
if (!IS_DEV_ENV) {
  // Only load webpack manifest file in production. In dev, the web and webpack
  // containers can't coordinate, so there no guarantee that the manifest file
  // exists when the web server boots. We therefore ignore the manifest file in
  // dev reload
  webpackManifest = require(`../../../public/manifest.json`)
}

const cdnAvailable = Settings.cdn && Settings.cdn.web && !!Settings.cdn.web.host
const staticFilesBase = cdnAvailable ? Settings.cdn.web.host : '/'

const sentryEnabled =
  Settings.sentry && Settings.sentry.frontend && !!Settings.sentry.frontend.dsn

module.exports = function(webRouter) {
  webRouter.use(function(req, res, next) {
    res.locals.session = req.session

    req.externalAuthenticationSystemUsed =
      Features.externalAuthenticationSystemUsed
    res.locals.externalAuthenticationSystemUsed =
      Features.externalAuthenticationSystemUsed
    req.hasFeature = res.locals.hasFeature = Features.hasFeature

    const resourceHints = []
    res.locals.finishPreloading = function() {
      if (!Settings.addResourceHints) {
        // refuse to add the Link header
        return
      }
      if (!resourceHints.length) {
        // do not set an empty header
        return
      }

      function crossorigin(resource) {
        return resource.crossorigin ? ';crossorigin' : ''
      }
      res.setHeader(
        'Link',
        resourceHints
          .map(r => `<${r.uri}>;rel=${r.rel};as=${r.as}${crossorigin(r)}`)
          .join(',')
      )
    }

    res.locals.preload = function(uri, as, crossorigin) {
      resourceHints.push({ rel: 'preload', uri, as, crossorigin })
    }
    res.locals.preloadCss = function(themeModifier) {
      res.locals.preload(res.locals.buildCssPath(themeModifier), 'style')
    }
    res.locals.preloadFont = function(name) {
      // IE11 and Opera Mini are the only browsers that do not support WOFF 2.0
      //  https://caniuse.com/#search=woff2
      // They both ignore the preload header, so this is OK
      //  https://caniuse.com/#search=preload
      const uri = res.locals.staticPath(`/fonts/${name}.woff2`)
      res.locals.preload(uri, 'font', true)
    }
    res.locals.preloadImg = function(path) {
      res.locals.preload(res.locals.buildImgPath(path), 'image')
    }

    res.locals.preloadCommonResources = function() {
      res.locals.preloadCss()
      if (Settings.brandPrefix === 'sl-') {
        ;[
          'font-awesome-v470',
          'merriweather-v21-latin-regular',
          'open-sans-v17-latin-regular',
          'open-sans-v17-latin-700'
        ].forEach(res.locals.preloadFont)
      } else {
        ;[
          'font-awesome-v470',
          'lato-v16-latin-ext-regular',
          'lato-v16-latin-ext-700',
          'merriweather-v21-latin-regular'
        ].forEach(res.locals.preloadFont)
      }
      if (HAS_MULTIPLE_LANG) {
        res.locals.preloadImg('sprite.png')
      }
    }

    const actualRender = res.render
    res.render = function() {
      if (Settings.addResourceHints && !resourceHints.length) {
        res.locals.preloadCommonResources()
        res.locals.finishPreloading()
      }
      actualRender.apply(res, arguments)
    }

    res.locals.buildBaseAssetPath = function() {
      // Return the base asset path (including the CDN url) so that webpack can
      // use this to dynamically fetch scripts (e.g. PDFjs worker)
      return res.locals.staticPath('/')
    }

    res.locals.staticPath = function(path) {
      if (staticFilesBase === '/') {
        return path.indexOf('/') === 0 ? path : '/' + path
      }
      if (path.indexOf('/') === 0) {
        // preserve the path component of the base url
        path = path.substring(1)
      }
      return new URL(path, staticFilesBase).href
    }

    res.locals.buildJsPath = function(jsFile) {
      let path
      if (IS_DEV_ENV) {
        // In dev: resolve path within JS asset directory
        // We are *not* guaranteed to have a manifest file when the server
        // starts up
        path = Path.join('/js', jsFile)
      } else {
        // In production: resolve path from webpack manifest file
        // We are guaranteed to have a manifest file since webpack compiles in
        // the build
        path = webpackManifest[jsFile]
      }

      return res.locals.staticPath(path)
    }

    // Temporary hack while jQuery/Angular dependencies are *not* bundled,
    // instead copied into output directory
    res.locals.buildCopiedJsAssetPath = function(jsFile) {
      let path
      if (IS_DEV_ENV) {
        // In dev: resolve path to root directory
        // We are *not* guaranteed to have a manifest file when the server
        // starts up
        path = Path.join('/', jsFile)
      } else {
        // In production: resolve path from webpack manifest file
        // We are guaranteed to have a manifest file since webpack compiles in
        // the build
        path = webpackManifest[jsFile]
      }

      return res.locals.staticPath(path)
    }

    res.locals.moment = moment

    const IEEE_BRAND_ID = 15
    res.locals.isIEEE = brandVariation =>
      brandVariation && brandVariation.brand_id === IEEE_BRAND_ID

    res.locals.getCssThemeModifier = function(userSettings, brandVariation) {
      // Themes only exist in OL v2
      if (Settings.hasThemes) {
        // The IEEE theme takes precedence over the user personal setting, i.e. a user with
        // a theme setting of "light" will still get the IEE theme in IEEE branded projects.
        if (res.locals.isIEEE(brandVariation)) {
          return 'ieee-'
        } else if (userSettings && userSettings.overallTheme != null) {
          return userSettings.overallTheme
        }
      }
    }

    function _buildCssFileName(themeModifier) {
      return `${Settings.brandPrefix}${themeModifier || ''}style.css`
    }

    res.locals.buildCssPath = function(themeModifier) {
      const cssFileName = _buildCssFileName(themeModifier)

      let path
      if (IS_DEV_ENV) {
        // In dev: resolve path within CSS asset directory
        // We are *not* guaranteed to have a manifest file when the server
        // starts up
        path = Path.join('/stylesheets/', cssFileName)
      } else {
        // In production: resolve path from webpack manifest file
        // We are guaranteed to have a manifest file since webpack compiles in
        // the build
        path = webpackManifest[cssFileName]
      }

      return res.locals.staticPath(path)
    }

    res.locals.buildImgPath = function(imgFile) {
      const path = Path.join('/img/', imgFile)
      return res.locals.staticPath(path)
    }

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
      const user = AuthenticationController.getSessionUser(req)
      return (user && user.email) || ''
    }

    res.locals.StringHelper = StringHelper

    res.locals.buildReferalUrl = function(referalMedium) {
      let url = Settings.siteUrl
      const referralId = res.locals.getReferalId()
      if (referralId) {
        url += `?r=${referralId}&rm=${referalMedium}&rs=b` // Referal source = bonus
      }
      return url
    }
    res.locals.getReferalId = function() {
      const currentUser = AuthenticationController.getSessionUser(req)
      return currentUser && currentUser.referal_id
    }

    res.locals.csrfToken = req.csrfToken()

    res.locals.gaToken = Settings.analytics.ga.token
    res.locals.gaOptimizeId = Settings.analytics.gaOptimize.id

    res.locals.getReqQueryParam = field => req.query[field]

    const currentUser = AuthenticationController.getSessionUser(req)
    if (currentUser) {
      res.locals.user = {
        email: currentUser.email,
        first_name: currentUser.first_name,
        last_name: currentUser.last_name
      }
    }
    res.locals.sentryEnabled = sentryEnabled

    res.locals.getLoggedInUserId = () =>
      AuthenticationController.getLoggedInUserId(req)
    res.locals.getSessionUser = () =>
      AuthenticationController.getSessionUser(req)

    // Clone the nav settings so they can be modified for each request
    res.locals.nav = {}
    for (const key in Settings.nav) {
      res.locals.nav[key] = _.clone(Settings.nav[key])
    }
    res.locals.templates = Settings.templateLinks

    if (Settings.reloadModuleViewsOnEachRequest) {
      Modules.loadViewIncludes()
    }
    res.locals.moduleIncludes = Modules.moduleIncludes
    res.locals.moduleIncludesAvailable = Modules.moduleIncludesAvailable

    res.locals.uiConfig = {
      defaultResizerSizeOpen: 7,
      defaultResizerSizeClosed: 7,
      eastResizerCursor: 'ew-resize',
      westResizerCursor: 'ew-resize',
      chatResizerSizeOpen: 7,
      chatResizerSizeClosed: 0,
      chatMessageBorderSaturation: '85%',
      chatMessageBorderLightness: '40%',
      chatMessageBgSaturation: '85%',
      chatMessageBgLightness: '40%'
    }

    // TODO
    if (Settings.hasThemes) {
      res.locals.overallThemes = [
        {
          name: 'Default',
          val: '',
          path: res.locals.buildCssPath(null)
        },
        {
          name: 'Light',
          val: 'light-',
          path: res.locals.buildCssPath('light-')
        }
      ]
    }

    res.locals.settings = Settings

    res.locals.ExposedSettings = {
      isOverleaf: !!Settings.overleaf,
      appName: Settings.appName,
      hasSamlBeta: req.session.samlBeta,
      hasSamlFeature: Features.hasFeature('saml'),
      samlInitPath: Settings.saml.ukamf.initPath,
      siteUrl: Settings.siteUrl,
      emailConfirmationDisabled: Settings.emailConfirmationDisabled,
      recaptchaSiteKeyV3: Settings.recaptcha && Settings.recaptcha.siteKeyV3,
      recaptchaDisabled: Settings.recaptcha && Settings.recaptcha.disabled,
      validRootDocExtensions: Settings.validRootDocExtensions,
      sentryDsn: Settings.sentry && Settings.sentry.publicDSN
    }
    next()
  })
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
    res.send(`importScripts('${res.locals.staticPath(workerPath)}');`)
  })
}

function cspMiddleware() {
  const csp = Settings.security.csp
  const cdnOrigin = cdnAvailable
    ? new URL(Settings.cdn.web.host).origin
    : undefined
  const compilesOrigin = Settings.pdfDownloadDomain
    ? new URL(Settings.pdfDownloadDomain).origin
    : undefined
  const sentryOrigin = sentryEnabled
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

    if (sentryEnabled) {
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

    if (cdnAvailable) {
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
