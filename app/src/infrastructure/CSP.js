const Settings =
  require('settings-sharelatex') || require('../../../config/settings.defaults')
const { URL } = require('url')

const staticFilesBase = Settings.cdn.web.host.replace(/\/$/, '')

module.exports = function(webRouter) {
  if (
    Settings.security &&
    Settings.security.csp &&
    (Settings.security.csp.reportOnly || Settings.security.csp.enforce)
  ) {
    webRouter.use(getCspMiddleware())
  }
  webRouter.use('/generate/worker', function(req, res) {
    const workerPath = req.path
    if (workerPath.indexOf('/vendor') !== 0) {
      return res.sendStatus(404)
    }
    res.contentType('application/javascript')
    res.send(`importScripts('${staticFilesBase}${workerPath}');`)
  })
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
    const childSrc = []
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

    if (cfg.needsCompilesAccess) {
      if (compilesOrigin) {
        connectSrc.push(compilesOrigin)
      }
      // native pdf viewer
      frameSrc.push(compilesOrigin || SELF)
    }

    if (cfg.needsSocketIo) {
      uniqueWsUrlOrigins.map(wsUrl => {
        scriptSrc.push(wsUrl)
        connectSrc.push(wsUrl)
        // websocket support: http:// -> ws:// and https:// -> wss://
        connectSrc.push('ws' + wsUrl.slice(4))
      })
    }

    if (!cfg.needsPrefetch) {
      prefetchSrc.length = 0
    }
    if (!cfg.needsWorker) {
      workerSrc.length = 0
    }

    // backwards compatibility -- csp level 3 directives
    childSrc.push(...workerSrc)
    defaultSrc.push(...prefetchSrc)

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
    needsSocketIo: true,
    needsWorker: true
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
