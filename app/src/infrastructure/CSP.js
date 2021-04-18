const Settings =
  require('@overleaf/settings') || require('../../../config/settings.defaults')
const { URL } = require('url')
const Path = require('path')
const Crypto = require('crypto')
const { STATIC_FILES_BASE } = require('./WebpackAssets')

const staticFilesBase = STATIC_FILES_BASE

module.exports = function(app, webRouter) {
  if (
    Settings.security &&
    Settings.security.csp &&
    (Settings.security.csp.reportOnly || Settings.security.csp.enforce)
  ) {
    webRouter.use(getCspMiddleware())
  } else {
    webRouter.use(function(req, res, next) {
      res.setCSPFor = function(topic) {}
      next()
    })
  }
}

function getCspMiddleware() {
  const csp = Settings.security.csp
  const siteOrigin = new URL(Settings.siteUrl).origin
  const cdnOrigin = staticFilesBase.startsWith('http')
    ? new URL(staticFilesBase).origin
    : undefined
  const compilesOrigin = Settings.pdfDownloadDomain
    ? new URL(Settings.pdfDownloadDomain).origin
    : undefined
  const notificationsOrigin = Settings.apis.notifications.publicUrl
    ? new URL(Settings.apis.notifications.publicUrl).origin
    : undefined
  const spellingOrigin = Settings.apis.spelling.publicUrl
    ? new URL(Settings.apis.spelling.publicUrl).origin
    : undefined
  const sentryOrigin = Settings.sentry.frontend.dsn
    ? new URL(Settings.sentry.frontend.dsn).origin
    : undefined

  function getUniqueOrigins(...urls) {
    return Array.from(
      new Set(
        urls
          .filter(url => url !== undefined)
          .map(url => new URL(url, Settings.siteUrl).origin)
      )
    )
  }

  const uniqueWsUrlOrigins = getUniqueOrigins(
    Settings.wsUrl,
    Settings.wsUrlBeta,
    Settings.wsUrlFallback,
    Settings.wsUrlV2
  )
  const uniqueWsAssetUrlOrigins = getUniqueOrigins(
    Settings.wsAssetUrl || Settings.wsUrl,
    Settings.wsAssetUrlBeta || Settings.wsUrlBeta,
    Settings.wsAssetUrlFallback || Settings.wsUrlFallback,
    Settings.wsAssetUrlV2 || Settings.wsUrlV2
  )

  function getDigest(blob) {
    const hash = Crypto.createHash('sha512')
    hash.update(blob)
    return `'sha512-${hash.digest('base64')}'`
  }
  const angularSanitizeProbeDigest = getDigest('<img src="')

  const UNSAFE_INLINE = "'unsafe-inline'"
  const SELF = "'self'"
  const assetsOrigin = cdnOrigin || SELF
  const pdfDownloadOrigin = compilesOrigin || SELF
  let headerName
  if (csp.enforce) {
    headerName = 'Content-Security-Policy'
  } else {
    headerName = 'Content-Security-Policy-Report-Only'
  }

  function generateCSP(cfg) {
    const baseUri = [SELF]
    const childSrc = []
    const connectSrc = [SELF]
    const defaultSrc = []
    const fontSrc = [assetsOrigin]
    const formAction = [SELF]
    const frameAncestors = []
    const frameSrc = []
    const imgSrc = [assetsOrigin, 'data:', 'blob:']
    const manifestSrc = []
    const scriptSrc = [assetsOrigin]
    const styleSrc = [assetsOrigin]
    const workerSrc = []

    if (csp.blockInlineStyle && !cfg.hasUnsafeInlineStyle) {
      styleSrc.push(angularSanitizeProbeDigest)
    } else {
      styleSrc.push(UNSAFE_INLINE)
    }

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

    if (cdnOrigin && (cfg.connectCDN || Settings.esbuild.autoReload)) {
      // e.g. pdfjs cmaps or /launchpad for ide blob check
      connectSrc.push(cdnOrigin)
    }

    if (cfg.needsCompilesAccess) {
      connectSrc.push(pdfDownloadOrigin)
      // native pdf viewer
      frameSrc.push(pdfDownloadOrigin)
    }

    if (cfg.needsLearnWikiImageAccess) {
      imgSrc.push(SELF)
      imgSrc.push('https://wikimedia.org')
      imgSrc.push('https://www.filepicker.io')
    }

    if (cfg.needsNotificationsAccess) {
      connectSrc.push(SELF)
      connectSrc.push(notificationsOrigin)
    }

    if (cfg.needsProjectFileAccess) {
      // Binary file preview: /project/__PROJECT_ID__/file/__FILE_ID__
      imgSrc.push(SELF)
    }

    if (cfg.needsSocketIo) {
      uniqueWsUrlOrigins.forEach(wsUrl => {
        if (wsUrl === siteOrigin) {
          // 'self' covers http/https/ws/wss already
          return
        }
        connectSrc.push(wsUrl)
        // websocket support: http:// -> ws:// and https:// -> wss://
        connectSrc.push('ws' + wsUrl.slice(4))
      })
      uniqueWsAssetUrlOrigins.forEach(wsUrl => {
        if (wsUrl === siteOrigin) {
          // 'self' is shorter than 'https://...'
          wsUrl = SELF
        }
        scriptSrc.push(wsUrl)
      })
    }

    if (cfg.needsSpellingAccess) {
      connectSrc.push(spellingOrigin || SELF)
    }

    if (cfg.needsWorker) {
      // `Worker` are bootstrapped via `Blob`s sporting `importScript(...)`
      workerSrc.push('blob:')
    }

    // backwards compatibility -- csp level 3 directives
    childSrc.push(...workerSrc)

    return serializeCSP(
      {
        'base-uri': baseUri,
        'child-src': childSrc,
        'connect-src': connectSrc,
        'default-src': defaultSrc,
        'font-src': fontSrc,
        'form-action': formAction,
        'frame-ancestors': frameAncestors,
        'frame-src': frameSrc,
        'img-src': imgSrc,
        'manifest-src': manifestSrc,
        'script-src': scriptSrc,
        'style-src': styleSrc,
        'worker-src': workerSrc
      },
      { reportViolations: true, dropHTTPProtocol: true }
    )
  }

  function serializeCSP(directives, { reportViolations, dropHTTPProtocol }) {
    const policyAmend = []
    if (dropHTTPProtocol) {
      policyAmend.push('block-all-mixed-content')
    }
    if (reportViolations && csp.reportURL) {
      policyAmend.push(`report-uri ${csp.reportURL}`)
    }
    return Object.entries(directives)
      .map(([directive, origins]) => {
        if (dropHTTPProtocol) {
          origins = origins.map(origin => {
            if (origin.startsWith('http')) return new URL(origin).host
            return origin
          })
        }
        origins = Array.from(new Set(origins))
        return `${directive} ${origins.join(' ') || "'none'"}`
      })
      .concat(policyAmend)
      .join('; ')
  }

  const CSP_BONUS_PAGE = generateCSP({
    unsafeInlineStyle: true
  })
  // default CSP for other sources, like JSON or file downloads
  // lock down all but image source for loading the favicon
  const CSP_DEFAULT_MISC = serializeCSP(
    {
      'default-src': [],
      'form-action': [],
      'frame-ancestors': [],
      'img-src': [SELF, assetsOrigin]
    },
    { reportViolations: false }
  )
  // default CSP for rendering
  const CSP_DEFAULT_RENDER = generateCSP({})
  const CSP_DASHBOARD = generateCSP({
    needsFront: true,
    needsNotificationsAccess: true
  })
  const CSP_EDITOR = generateCSP({
    connectCDN: true,
    needsCompilesAccess: true,
    needsProjectFileAccess: true,
    needsSocketIo: true,
    needsSpellingAccess: true,
    needsWorker: true
  })
  const CSP_LAUNCHPAD = generateCSP({
    connectCDN: true,
    needsSocketIo: true
  })
  const CSP_LEARN = generateCSP({
    needsLearnWikiImageAccess: true,
    hasUnsafeInlineStyle: true
  })
  // the browsers 'native' viewer may use inline styles
  const CSP_OUTPUT_PDF = serializeCSP(
    {
      'default-src': [],
      'form-action': [],
      'frame-ancestors': [pdfDownloadOrigin],
      'img-src': [SELF, assetsOrigin],
      'style-src': [UNSAFE_INLINE]
    },
    { reportViolations: false }
  )
  const CSP_SUBSCRIPTION = generateCSP({ needsRecurly: true })
  const CSP_USER_GRAPH = generateCSP({
    needsWorker: true
  })

  const MODULE_PATH = Path.resolve(__dirname, '../../../modules')
  const VIEW_LAUNCHPAD = Path.resolve(
    MODULE_PATH,
    'launchpad/app/views/launchpad'
  )
  const VIEW_LEARN = Path.resolve(MODULE_PATH, 'learn/app/views/page')
  const VIEW_USER_GRAPH = Path.resolve(
    MODULE_PATH,
    'admin-panel/app/views/user/graph'
  )

  function setCSPFor(topic) {
    let headerValue
    switch (topic) {
      case 'initial':
        headerValue = CSP_DEFAULT_MISC
        break
      case 'output.pdf':
        headerValue = CSP_OUTPUT_PDF
        break
      case 'project/list':
        headerValue = CSP_DASHBOARD
        break
      case 'project/editor':
        headerValue = CSP_EDITOR
        break
      case 'referal/bonus':
        headerValue = CSP_BONUS_PAGE
        break
      case '/user/subscription/new':
      case '/user/subscription':
        headerValue = CSP_SUBSCRIPTION
        break
      case VIEW_LAUNCHPAD:
        headerValue = CSP_LAUNCHPAD
        break
      case VIEW_LEARN:
        headerValue = CSP_LEARN
        break
      case VIEW_USER_GRAPH:
        headerValue = CSP_USER_GRAPH
        break
      default:
        headerValue = CSP_DEFAULT_RENDER
    }
    // this === res
    this.setHeader(headerName, headerValue)
    // enable chaining
    return this
  }

  return function cspMiddleware(req, res, next) {
    res.setCSPFor = setCSPFor
    res.setCSPFor('initial')
    const actualRender = res.render
    res.render = function(view) {
      res.setCSPFor(view)
      actualRender.apply(res, arguments)
    }
    next()
  }
}
