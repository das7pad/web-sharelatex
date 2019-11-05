/* eslint-disable
    camelcase,
    handle-callback-err,
    max-len,
    new-cap,
    no-new-require,
    no-unused-vars,
    no-useless-escape,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const logger = require('logger-sharelatex')
const Settings = require('settings-sharelatex')
const SubscriptionFormatters = require('../Features/Subscription/SubscriptionFormatters')
const querystring = require('querystring')
const SystemMessageManager = require('../Features/SystemMessages/SystemMessageManager')
const AuthenticationController = require('../Features/Authentication/AuthenticationController')
const _ = require('underscore')
const Url = require('url')
const PackageVersions = require('./PackageVersions')
const htmlEncoder = new require('node-html-encoder').Encoder('numerical')
const Path = require('path')
const Features = require('./Features')
const Modules = require('./Modules')
const moment = require('moment')
const lodash = require('lodash')
const chokidar = require('chokidar')

const jsPath = '/js/'

const webpackManifestPath = Path.join(
  __dirname,
  `../../../public${jsPath}manifest.json`
)
let webpackManifest
if (['development', 'test'].includes(process.env.NODE_ENV)) {
  // In dev the web and webpack containers can race (and therefore the manifest
  // file may not be created when web is running), so watch the file for changes
  // and reload
  webpackManifest = {}
  const reloadManifest = () => {
    logger.log('[DEV] Reloading webpack manifest')
    webpackManifest = require(webpackManifestPath)
  }

  logger.log('[DEV] Watching webpack manifest')
  chokidar
    .watch(webpackManifestPath)
    .on('add', reloadManifest)
    .on('change', reloadManifest)
} else {
  logger.log('[PRODUCTION] Loading webpack manifest')
  webpackManifest = require(webpackManifestPath)
}

const cdnAvailable = Settings.cdn && Settings.cdn.web && !!Settings.cdn.web.host

const darkCdnAvailable =
  Settings.cdn && Settings.cdn.web && !!Settings.cdn.web.darkHost

const sentryEnabled =
  Settings.sentry && Settings.sentry.frontend && !!Settings.sentry.frontend.dsn

module.exports = function(app, webRouter, privateApiRouter, publicApiRouter) {
  webRouter.use(function(req, res, next) {
    res.locals.session = req.session
    return next()
  })

  const addSetContentDisposition = function(req, res, next) {
    res.setContentDisposition = function(type, opts) {
      const directives = (() => {
        const result = []
        for (let k in opts) {
          const v = opts[k]
          result.push(`${k}=\"${encodeURIComponent(v)}\"`)
        }
        return result
      })()
      const contentDispositionValue = `${type}; ${directives.join('; ')}`
      return res.setHeader('Content-Disposition', contentDispositionValue)
    }
    return next()
  }
  webRouter.use(addSetContentDisposition)
  privateApiRouter.use(addSetContentDisposition)
  publicApiRouter.use(addSetContentDisposition)

  webRouter.use(function(req, res, next) {
    req.externalAuthenticationSystemUsed =
      Features.externalAuthenticationSystemUsed
    res.locals.externalAuthenticationSystemUsed =
      Features.externalAuthenticationSystemUsed
    req.hasFeature = res.locals.hasFeature = Features.hasFeature
    return next()
  })

  webRouter.use(function(req, res, next) {
    let staticFilesBase
    const cdnBlocked = req.query.nocdn === 'true' || req.session.cdnBlocked
    const user_id = AuthenticationController.getLoggedInUserId(req)

    if (cdnBlocked && req.session.cdnBlocked == null) {
      logger.log(
        { user_id, ip: req != null ? req.ip : undefined },
        'cdnBlocked for user, not using it and turning it off for future requets'
      )
      req.session.cdnBlocked = true
    }

    const host = req.headers.host || ''
    const isDark =
      host
        .slice(0, 7)
        .toLowerCase()
        .indexOf('dark') !== -1
    const isSmoke = host.slice(0, 5).toLowerCase() === 'smoke'
    const isLive = !isDark && !isSmoke

    if (cdnAvailable && isLive && !cdnBlocked) {
      staticFilesBase = Settings.cdn.web.host
    } else if (darkCdnAvailable && isDark) {
      staticFilesBase = Settings.cdn.web.darkHost
    } else {
      staticFilesBase = ''
    }

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
        if (!resource.crossorigin) return ''
        return staticFilesBase ? ';crossorigin' : ''
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
      const uri = res.locals.staticPath(`/font/${name}.woff2`)
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
      res.locals.preloadImg('sprite.png')
    }

    const actualRender = res.render
    res.render = function() {
      if (Settings.addResourceHints && !resourceHints.length) {
        res.locals.preloadCommonResources()
        res.locals.finishPreloading()
      }
      actualRender.apply(res, arguments)
    }

    res.locals.staticPath = function(path) {
      if (staticFilesBase && path.indexOf('/') === 0) {
        // preserve the path component of the base url
        path = path.substring(1)
      }
      return Url.resolve(staticFilesBase, path)
    }

    res.locals.jsPath = jsPath
    res.locals.fullJsPath = res.locals.staticPath(jsPath)
    res.locals.lib = PackageVersions.lib

    res.locals.moment = moment

    res.locals.buildJsPath = function(jsFile, opts = {}) {
      // Resolve path from webpack manifest file
      let path = webpackManifest[jsFile]
      // If not found in manifest, it is directly linked, so fallback to
      // relevant public directory
      if (!path) {
        path = Path.join(jsPath, jsFile)
      }

      if (opts.cdn !== false) {
        path = res.locals.staticPath(path)
      }

      return path
    }

    const IEEE_BRAND_ID = 15
    res.locals.isIEEE = brandVariation =>
      (brandVariation != null ? brandVariation.brand_id : undefined) ===
      IEEE_BRAND_ID

    const _buildCssFileName = themeModifier =>
      `/${Settings.brandPrefix}${themeModifier || ''}style.css`

    res.locals.getCssThemeModifier = function(userSettings, brandVariation) {
      // Themes only exist in OL v2
      let themeModifier
      if (Settings.hasThemes != null) {
        // The IEEE theme takes precedence over the user personal setting, i.e. a user with
        // a theme setting of "light" will still get the IEE theme in IEEE branded projects.
        if (res.locals.isIEEE(brandVariation)) {
          themeModifier = 'ieee-'
        } else if (
          (userSettings != null ? userSettings.overallTheme : undefined) != null
        ) {
          themeModifier = userSettings.overallTheme
        }
      }
      return themeModifier
    }

    res.locals.buildCssPath = function(themeModifier, buildOpts) {
      const cssFileName = _buildCssFileName(themeModifier)
      const path = Path.join('/stylesheets/', cssFileName)
      return res.locals.staticPath(path)
    }

    res.locals.buildImgPath = function(imgFile) {
      const path = Path.join('/img/', imgFile)
      return res.locals.staticPath(path)
    }

    return next()
  })

  webRouter.use(function(req, res, next) {
    res.locals.settings = Settings
    return next()
  })

  webRouter.use(function(req, res, next) {
    res.locals.translate = function(key, vars, htmlEncode) {
      if (vars == null) {
        vars = {}
      }
      if (htmlEncode == null) {
        htmlEncode = false
      }
      vars.appName = Settings.appName
      const str = req.i18n.translate(key, vars)
      if (htmlEncode) {
        return htmlEncoder.htmlEncode(str)
      } else {
        return str
      }
    }
    // Don't include the query string parameters, otherwise Google
    // treats ?nocdn=true as the canonical version
    res.locals.currentUrl = Url.parse(req.originalUrl).pathname
    res.locals.getTranslationUrl = (
      spec // see settings.i18n.subdomainLang
    ) => spec.url + res.locals.currentUrl + '?setGlobalLng=' + spec.lngCode
    res.locals.capitalize = function(string) {
      if (string.length === 0) {
        return ''
      }
      return string.charAt(0).toUpperCase() + string.slice(1)
    }
    return next()
  })

  webRouter.use(function(req, res, next) {
    res.locals.getSiteHost = () =>
      Settings.siteUrl.substring(Settings.siteUrl.indexOf('//') + 2)
    return next()
  })

  webRouter.use(function(req, res, next) {
    res.locals.getUserEmail = function() {
      const user = AuthenticationController.getSessionUser(req)
      const email = (user != null ? user.email : undefined) || ''
      return email
    }
    return next()
  })

  webRouter.use(function(req, res, next) {
    res.locals.StringHelper = require('../Features/Helpers/StringHelper')
    return next()
  })

  webRouter.use(function(req, res, next) {
    res.locals.formatProjectPublicAccessLevel = function(privilegeLevel) {
      const formatedPrivileges = {
        private: 'Private',
        readOnly: 'Public: Read Only',
        readAndWrite: 'Public: Read and Write'
      }
      return formatedPrivileges[privilegeLevel] || 'Private'
    }
    return next()
  })

  webRouter.use(function(req, res, next) {
    res.locals.buildReferalUrl = function(referal_medium) {
      let url = Settings.siteUrl
      const currentUser = AuthenticationController.getSessionUser(req)
      if (
        currentUser != null &&
        (currentUser != null ? currentUser.referal_id : undefined) != null
      ) {
        url += `?r=${currentUser.referal_id}&rm=${referal_medium}&rs=b` // Referal source = bonus
      }
      return url
    }
    res.locals.getReferalId = function() {
      const currentUser = AuthenticationController.getSessionUser(req)
      if (
        currentUser != null &&
        (currentUser != null ? currentUser.referal_id : undefined) != null
      ) {
        return currentUser.referal_id
      }
    }
    res.locals.getReferalTagLine = function() {
      const tagLines = [
        'Roar!',
        'Shout about us!',
        'Please recommend us',
        'Tell the world!',
        'Thanks for using ShareLaTeX'
      ]
      return tagLines[Math.floor(Math.random() * tagLines.length)]
    }
    res.locals.getRedirAsQueryString = function() {
      if (req.query.redir != null) {
        return `?${querystring.stringify({ redir: req.query.redir })}`
      }
      return ''
    }

    res.locals.getLoggedInUserId = () =>
      AuthenticationController.getLoggedInUserId(req)
    res.locals.isUserLoggedIn = () =>
      AuthenticationController.isUserLoggedIn(req)
    res.locals.getSessionUser = () =>
      AuthenticationController.getSessionUser(req)

    return next()
  })

  webRouter.use(function(req, res, next) {
    res.locals.csrfToken = req != null ? req.csrfToken() : undefined
    return next()
  })

  webRouter.use(function(req, res, next) {
    res.locals.getReqQueryParam = field =>
      req.query != null ? req.query[field] : undefined
    return next()
  })

  webRouter.use(function(req, res, next) {
    res.locals.formatPrice = SubscriptionFormatters.formatPrice
    return next()
  })

  webRouter.use(function(req, res, next) {
    const currentUser = AuthenticationController.getSessionUser(req)
    if (currentUser != null) {
      res.locals.user = {
        email: currentUser.email,
        first_name: currentUser.first_name,
        last_name: currentUser.last_name
      }
      if (req.session.justRegistered) {
        res.locals.justRegistered = true
        delete req.session.justRegistered
      }
      if (req.session.justLoggedIn) {
        res.locals.justLoggedIn = true
        delete req.session.justLoggedIn
      }
    }
    res.locals.gaToken = Settings.analytics && Settings.analytics.ga.token
    res.locals.tenderUrl = Settings.tenderUrl
    res.locals.sentryEnabled = sentryEnabled
    if (sentryEnabled) {
      res.locals.sentrySRC =
        Settings.sentry.src ||
        res.locals.buildJsPath(
          `libs/${PackageVersions.lib('sentry')}/bundle.min.js`
        )
    }
    return next()
  })

  webRouter.use(function(req, res, next) {
    if (req.query != null && req.query.scribtex_path != null) {
      res.locals.lookingForScribtex = true
      res.locals.scribtexPath = req.query.scribtex_path
    }
    return next()
  })

  webRouter.use(function(req, res, next) {
    // Clone the nav settings so they can be modified for each request
    res.locals.nav = {}
    for (let key in Settings.nav) {
      const value = Settings.nav[key]
      res.locals.nav[key] = _.clone(Settings.nav[key])
    }
    res.locals.templates = Settings.templateLinks
    if (res.locals.nav.header) {
      console.error(
        {},
        'The `nav.header` setting is no longer supported, use `nav.header_extras` instead'
      )
    }
    return next()
  })

  webRouter.use((req, res, next) =>
    SystemMessageManager.getMessages(function(error, messages) {
      if (messages == null) {
        messages = []
      }
      res.locals.systemMessages = messages
      return next()
    })
  )

  webRouter.use(function(req, res, next) {
    res.locals.query = req.query
    return next()
  })

  webRouter.use(function(req, res, next) {
    const subdomain = _.find(
      Settings.i18n.subdomainLang,
      subdomain => subdomain.lngCode === req.showUserOtherLng && !subdomain.hide
    )
    res.locals.recomendSubdomain = subdomain
    res.locals.currentLngCode = req.lng
    return next()
  })

  webRouter.use(function(req, res, next) {
    if (Settings.reloadModuleViewsOnEachRequest) {
      Modules.loadViewIncludes()
    }
    res.locals.moduleIncludes = Modules.moduleIncludes
    res.locals.moduleIncludesAvailable = Modules.moduleIncludesAvailable
    return next()
  })

  webRouter.use(function(req, res, next) {
    const isSl = Settings.brandPrefix === 'sl-'
    res.locals.uiConfig = {
      defaultResizerSizeOpen: isSl ? 24 : 7,
      defaultResizerSizeClosed: isSl ? 24 : 7,
      eastResizerCursor: isSl ? null : 'ew-resize',
      westResizerCursor: isSl ? null : 'ew-resize',
      chatResizerSizeOpen: isSl ? 12 : 7,
      chatResizerSizeClosed: 0,
      chatMessageBorderSaturation: isSl ? '70%' : '85%',
      chatMessageBorderLightness: isSl ? '70%' : '40%',
      chatMessageBgSaturation: isSl ? '60%' : '85%',
      chatMessageBgLightness: isSl ? '97%' : '40%',
      defaultFontFamily: isSl ? 'monaco' : 'lucida',
      defaultLineHeight: isSl ? 'compact' : 'normal',
      renderAnnouncements: isSl
    }
    return next()
  })

  webRouter.use(function(req, res, next) {
    // TODO
    if (Settings.hasThemes != null) {
      res.locals.overallThemes = [
        {
          name: 'Default',
          val: '',
          path: res.locals.buildCssPath(null, { hashedPath: true })
        },
        {
          name: 'Light',
          val: 'light-',
          path: res.locals.buildCssPath('light-', { hashedPath: true })
        }
      ]
    }
    return next()
  })

  return webRouter.use(function(req, res, next) {
    res.locals.ExposedSettings = {
      isOverleaf: Settings.overleaf != null,
      appName: Settings.appName,
      hasSamlBeta: req.session.samlBeta,
      hasSamlFeature: Features.hasFeature('saml'),
      samlInitPath: lodash.get(Settings, ['saml', 'ukamf', 'initPath']),
      siteUrl: Settings.siteUrl,
      recaptchaSiteKeyV3:
        Settings.recaptcha != null ? Settings.recaptcha.siteKeyV3 : undefined,
      recaptchaDisabled:
        Settings.recaptcha != null ? Settings.recaptcha.disabled : undefined,
      validRootDocExtensions: Settings.validRootDocExtensions
    }
    return next()
  })
}

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null
    ? transform(value)
    : undefined
}
