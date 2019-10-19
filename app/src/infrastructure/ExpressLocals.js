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
const hashedFiles = require('./HashedFiles')
const Path = require('path')
const Features = require('./Features')
const Modules = require('./Modules')
const moment = require('moment')

const jsPath = Settings.useMinifiedJs ? '/minjs/' : '/js/'

const ace = PackageVersions.lib('ace')
const pdfjs = PackageVersions.lib('pdfjs')
const fineuploader = PackageVersions.lib('fineuploader')

const cdnAvailable =
  __guard__(Settings.cdn != null ? Settings.cdn.web : undefined, x => x.host) !=
  null
const darkCdnAvailable =
  __guard__(
    Settings.cdn != null ? Settings.cdn.web : undefined,
    x1 => x1.darkHost
  ) != null

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
    res.locals.userIsFromOLv1 = user =>
      (user.overleaf != null ? user.overleaf.id : undefined) != null
    res.locals.userIsFromSL = user =>
      (user.overleaf != null ? user.overleaf.id : undefined) == null
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

    const isDark =
      __guard__(
        __guard__(req.headers != null ? req.headers.host : undefined, x3 =>
          x3.slice(0, 7)
        ),
        x2 => x2.toLowerCase().indexOf('dark')
      ) !== -1
    const isSmoke =
      __guard__(
        __guard__(req.headers != null ? req.headers.host : undefined, x5 =>
          x5.slice(0, 5)
        ),
        x4 => x4.toLowerCase()
      ) === 'smoke'
    const isLive = !isDark && !isSmoke

    if (cdnAvailable && isLive && !cdnBlocked) {
      staticFilesBase = __guard__(
        Settings.cdn != null ? Settings.cdn.web : undefined,
        x6 => x6.host
      )
    } else if (darkCdnAvailable && isDark) {
      staticFilesBase = __guard__(
        Settings.cdn != null ? Settings.cdn.web : undefined,
        x7 => x7.darkHost
      )
    } else {
      staticFilesBase = ''
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

    res.locals.buildJsPath = function(jsFile, opts) {
      if (opts == null) {
        opts = {}
      }
      let path = Path.join(jsPath, jsFile)

      if (
        opts.hashedPath &&
        !Settings.cdn.hasUniqueURI &&
        hashedFiles[path] != null
      ) {
        path = hashedFiles[path]
      }

      if (opts.qs == null) {
        opts.qs = {}
      }

      if (opts.cdn !== false) {
        path = res.locals.staticPath(path)
      }

      const qs = querystring.stringify(opts.qs)

      if (opts.removeExtension === true) {
        path = path.slice(0, -3)
      }

      if (qs != null && qs.length > 0) {
        path = path + '?' + qs
      }
      return path
    }

    res.locals.buildWebpackPath = function(jsFile, opts) {
      if (opts == null) {
        opts = {}
      }
      if (Settings.webpack != null && !Settings.useMinifiedJs) {
        let path = Path.join(jsPath, jsFile)
        if (opts.removeExtension === true) {
          path = path.slice(0, -3)
        }
        return `${Settings.webpack.url}/public${path}`
      } else {
        return res.locals.buildJsPath(jsFile, opts)
      }
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
      if (
        (buildOpts != null ? buildOpts.hashedPath : undefined) &&
        !Settings.cdn.hasUniqueURI &&
        hashedFiles[path] != null
      ) {
        const hashedPath = hashedFiles[path]
        return res.locals.staticPath(hashedPath)
      }
      return res.locals.staticPath(path)
    }

    res.locals.buildImgPath = function(imgFile) {
      const path = Path.join('/img/', imgFile)
      return res.locals.staticPath(path)
    }

    res.locals.mathJaxPath = res.locals.buildJsPath('libs/mathjax/MathJax.js', {
      cdn: Settings.cdn.ServeMathJax,
      qs: { config: 'TeX-AMS_HTML,Safe' }
    })

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
    res.locals.gaToken = __guard__(
      Settings.analytics != null ? Settings.analytics.ga : undefined,
      x2 => x2.token
    )
    res.locals.tenderUrl = Settings.tenderUrl
    res.locals.sentrySrc =
      Settings.sentry != null ? Settings.sentry.src : undefined
    res.locals.sentryPublicDSN =
      Settings.sentry != null ? Settings.sentry.publicDSN : undefined
    res.locals.sentrySampleRate =
      (Settings.sentry != null ? Settings.sentry.sampleRate : undefined) || 0.01
    res.locals.sentryCommit =
      (Settings.sentry != null ? Settings.sentry.commit : undefined) ||
      '@@COMMIT@@'
    res.locals.sentryRelease =
      (Settings.sentry != null ? Settings.sentry.release : undefined) ||
      '@@RELEASE@@'
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
      siteUrl: Settings.siteUrl,
      recaptchaSiteKeyV3:
        Settings.recaptcha != null ? Settings.recaptcha.siteKeyV3 : undefined,
      recaptchaDisabled:
        Settings.recaptcha != null ? Settings.recaptcha.disabled : undefined
    }
    return next()
  })
}

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null
    ? transform(value)
    : undefined
}
