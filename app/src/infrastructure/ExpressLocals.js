const logger = require('logger-sharelatex')
const Settings = require('settings-sharelatex')
const _ = require('lodash')
const Url = require('url')
const NodeHtmlEncoder = require('node-html-encoder').Encoder
const Path = require('path')
const moment = require('moment')

const IS_DEV_ENV = ['development', 'test'].includes(process.env.NODE_ENV)

const Features = require('./Features')
const AuthenticationController = require('../Features/Authentication/AuthenticationController')
const PackageVersions = require('./PackageVersions')
const Modules = require('./Modules')

const htmlEncoder = new NodeHtmlEncoder('numerical')

let webpackManifest = {}
if (!IS_DEV_ENV) {
  // Only load webpack manifest file in production. In dev, the web and webpack
  // containers can't coordinate, so there no guarantee that the manifest file
  // exists when the web server boots. We therefore ignore the manifest file in
  // dev reload
  webpackManifest = require(`../../../public/js/manifest.json`)
}

const cdnAvailable = Settings.cdn && Settings.cdn.web && !!Settings.cdn.web.host

const sentryEnabled =
  Settings.sentry && Settings.sentry.frontend && !!Settings.sentry.frontend.dsn

module.exports = function(webRouter, privateApiRouter, publicApiRouter) {
  webRouter.use(function(req, res, next) {
    res.locals.session = req.session
    next()
  })

  function addSetContentDisposition(req, res, next) {
    res.setContentDisposition = function(type, opts) {
      const directives = _.map(
        opts,
        (v, k) => `${k}="${encodeURIComponent(v)}"`
      )
      const contentDispositionValue = `${type}; ${directives.join('; ')}`
      res.setHeader('Content-Disposition', contentDispositionValue)
    }
    next()
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
    next()
  })

  webRouter.use(function(req, res, next) {
    let staticFilesBase
    const cdnBlocked = req.query.nocdn === 'true' || req.session.cdnBlocked
    const userId = AuthenticationController.getLoggedInUserId(req)
    if (cdnBlocked && req.session.cdnBlocked == null) {
      logger.log(
        { user_id: userId, ip: req != null ? req.ip : undefined },
        'cdnBlocked for user, not using it and turning it off for future requets'
      )
      req.session.cdnBlocked = true
    }
    const host = req.headers && req.headers.host
    const isSmoke = host.slice(0, 5).toLowerCase() === 'smoke'
    if (cdnAvailable && !isSmoke && !cdnBlocked) {
      staticFilesBase = Settings.cdn.web.host
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

    res.locals.buildJsPath = function(jsFile, opts = {}) {
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

      if (opts.cdn !== false) {
        path = res.locals.staticPath(path)
      }

      return path
    }

    res.locals.lib = PackageVersions.lib

    res.locals.moment = moment

    const IEEE_BRAND_ID = 15
    res.locals.isIEEE = brandVariation =>
      (brandVariation != null ? brandVariation.brand_id : undefined) ===
      IEEE_BRAND_ID

    const _buildCssFileName = themeModifier =>
      `${Settings.brandPrefix}${themeModifier || ''}style.css`

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
      let path = webpackManifest[cssFileName]
      if (!path) {
        path = Path.join('/stylesheets/', cssFileName)
      }
      return res.locals.staticPath(path)
    }

    res.locals.buildImgPath = function(imgFile) {
      const path = Path.join('/img/', imgFile)
      return res.locals.staticPath(path)
    }

    next()
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
    next()
  })

  webRouter.use(function(req, res, next) {
    const subdomain = _.find(
      Settings.i18n.subdomainLang,
      subdomain => subdomain.lngCode === req.showUserOtherLng && !subdomain.hide
    )
    res.locals.recomendSubdomain = subdomain
    res.locals.currentLngCode = req.lng
    next()
  })

  webRouter.use(function(req, res, next) {
    res.locals.getUserEmail = function() {
      const user = AuthenticationController.getSessionUser(req)
      const email = (user != null ? user.email : undefined) || ''
      return email
    }
    next()
  })

  webRouter.use(function(req, res, next) {
    res.locals.StringHelper = require('../Features/Helpers/StringHelper')
    next()
  })

  webRouter.use(function(req, res, next) {
    res.locals.buildReferalUrl = function(referalMedium) {
      let url = Settings.siteUrl
      const currentUser = AuthenticationController.getSessionUser(req)
      if (
        currentUser != null &&
        (currentUser != null ? currentUser.referal_id : undefined) != null
      ) {
        url += `?r=${currentUser.referal_id}&rm=${referalMedium}&rs=b` // Referal source = bonus
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
    next()
  })

  webRouter.use(function(req, res, next) {
    res.locals.csrfToken = req != null ? req.csrfToken() : undefined
    next()
  })

  webRouter.use(function(req, res, next) {
    res.locals.gaToken = Settings.analytics && Settings.analytics.ga.token
    next()
  })

  webRouter.use(function(req, res, next) {
    res.locals.getReqQueryParam = field =>
      req.query != null ? req.query[field] : undefined
    next()
  })

  webRouter.use(function(req, res, next) {
    const currentUser = AuthenticationController.getSessionUser(req)
    if (currentUser != null) {
      res.locals.user = {
        email: currentUser.email,
        first_name: currentUser.first_name,
        last_name: currentUser.last_name
      }
    }
    res.locals.sentryEnabled = sentryEnabled
    if (sentryEnabled) {
      res.locals.sentrySRC =
        Settings.sentry.src ||
        res.locals.staticPath(
          `/vendor/${PackageVersions.lib('sentry')}/bundle.min.js`
        )
    }
    next()
  })

  webRouter.use(function(req, res, next) {
    res.locals.getLoggedInUserId = () =>
      AuthenticationController.getLoggedInUserId(req)
    res.locals.getSessionUser = () =>
      AuthenticationController.getSessionUser(req)
    next()
  })

  webRouter.use(function(req, res, next) {
    // Clone the nav settings so they can be modified for each request
    res.locals.nav = {}
    for (let key in Settings.nav) {
      res.locals.nav[key] = _.clone(Settings.nav[key])
    }
    res.locals.templates = Settings.templateLinks
    next()
  })

  webRouter.use(function(req, res, next) {
    if (Settings.reloadModuleViewsOnEachRequest) {
      Modules.loadViewIncludes()
    }
    res.locals.moduleIncludes = Modules.moduleIncludes
    res.locals.moduleIncludesAvailable = Modules.moduleIncludesAvailable
    next()
  })

  webRouter.use(function(req, res, next) {
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
      chatMessageBgLightness: '40%',
      defaultFontFamily: 'lucida',
      defaultLineHeight: 'normal',
      renderAnnouncements: false
    }
    next()
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
    next()
  })

  webRouter.use(function(req, res, next) {
    res.locals.settings = Settings
    next()
  })

  webRouter.use(function(req, res, next) {
    res.locals.ExposedSettings = {
      isOverleaf: Settings.overleaf != null,
      appName: Settings.appName,
      hasSamlBeta: req.session.samlBeta,
      hasSamlFeature: Features.hasFeature('saml'),
      samlInitPath: _.get(Settings, ['saml', 'ukamf', 'initPath']),
      siteUrl: Settings.siteUrl,
      recaptchaSiteKeyV3:
        Settings.recaptcha != null ? Settings.recaptcha.siteKeyV3 : undefined,
      recaptchaDisabled:
        Settings.recaptcha != null ? Settings.recaptcha.disabled : undefined,
      validRootDocExtensions: Settings.validRootDocExtensions
    }
    next()
  })
}
