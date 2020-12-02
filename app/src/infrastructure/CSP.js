const Settings =
  require('@overleaf/settings') || require('../../../config/settings.defaults')
const { URL } = require('url')
const Path = require('path')
const Crypto = require('crypto')

const staticFilesBase = Settings.cdn.web.host.replace(/\/$/, '')

const NG_CLOAK =
  '@charset "UTF-8";[ng\\:cloak],[ng-cloak],[data-ng-cloak],[x-ng-cloak],.ng-cloak,.x-ng-cloak,.ng-hide:not(.ng-hide-animate){display:none !important;}ng\\:form{display:block;}.ng-animate-shim{visibility:hidden;}.ng-anchor{position:absolute;}'

module.exports = function(app, webRouter) {
  app.locals.NG_CLOAK = NG_CLOAK
  if (
    Settings.security &&
    Settings.security.csp &&
    (Settings.security.csp.reportOnly || Settings.security.csp.enforce)
  ) {
    webRouter.use(getCspMiddleware())
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
  const ngCloakDigest = getDigest(NG_CLOAK)
  const angularSanitizeProbeDigest = getDigest('<img src="')

  const SELF = "'self'"
  const assetsOrigin = cdnOrigin || SELF

  function generateCSP(cfg) {
    const baseUri = [SELF]
    const childSrc = []
    const connectSrc = [SELF]
    const defaultSrc = []
    const fontSrc = [assetsOrigin, 'about:']
    const formAction = [SELF]
    const frameAncestors = []
    const frameSrc = []
    const imgSrc = [assetsOrigin, 'data:', 'blob:']
    const manifestSrc = []
    const scriptSrc = [assetsOrigin]
    const styleSrc = [assetsOrigin]
    const workerSrc = []

    if (csp.blockInlineStyle) {
      // TODO: Add Ace and MathJax digests
      styleSrc.push(ngCloakDigest, angularSanitizeProbeDigest)
    } else {
      styleSrc.push("'unsafe-inline'")
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

    if (cdnOrigin && cfg.connectCDN) {
      // e.g. pdfjs cmaps or /launchpad for ide blob check
      connectSrc.push(cdnOrigin)
    }

    if (cfg.needsCompilesAccess) {
      if (compilesOrigin) {
        connectSrc.push(compilesOrigin)
      }
      // native pdf viewer
      frameSrc.push(compilesOrigin || SELF)
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

    if (cfg.needsWorker) {
      // `Worker` are bootstrapped via `Blob`s sporting `importScript(...)`
      workerSrc.push('blob:')
    }

    // backwards compatibility -- csp level 3 directives
    childSrc.push(...workerSrc)

    let policyAmend = ['block-all-mixed-content']
    if (csp.reportURL) {
      policyAmend.push(`report-uri ${csp.reportURL}`)
    }
    return Object.entries({
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
    })
      .map(([directive, origins]) => {
        origins = Array.from(new Set(origins))
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
    needsProjectFileAccess: true,
    needsSocketIo: true,
    needsWorker: true
  })
  const CSP_LAUNCHPAD = generateCSP({
    connectCDN: true,
    needsSocketIo: true
  })
  const CSP_SUBSCRIPTION = generateCSP({ needsRecurly: true })

  const MODULE_PATH = Path.resolve(__dirname, '../../../modules')
  const VIEW_LAUNCHPAD = Path.resolve(
    MODULE_PATH,
    'launchpad/app/views/launchpad'
  )

  return function cspMiddleware(req, res, next) {
    const actualRender = res.render
    res.render = function(view) {
      let headerValue
      switch (view) {
        case 'project/list':
          headerValue = CSP_DASHBOARD
          break
        case 'project/editor':
          headerValue = CSP_EDITOR
          break
        case '/user/subscription/new':
        case '/user/subscription':
          headerValue = CSP_SUBSCRIPTION
          break
        case VIEW_LAUNCHPAD:
          headerValue = CSP_LAUNCHPAD
          break
        default:
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
