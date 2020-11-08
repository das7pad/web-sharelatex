const Settings =
  require('settings-sharelatex') || require('../../../config/settings.defaults')
const logger = require('logger-sharelatex')
const pug = require('pug-runtime')

const HAS_MULTIPLE_LANG = Object.keys(Settings.i18n.subdomainLang).length > 1

const Features = require('./Features')
const AuthenticationController = require('../Features/Authentication/AuthenticationController')
const Modules = require('./Modules')
const SafeHTMLSubstitute = require('../Features/Helpers/SafeHTMLSubstitution')

let webpackManifest = {}
if (Settings.useDevAssets) {
  webpackManifest = require('../../../public/manifest-dev.json')
} else {
  webpackManifest = require('../../../public/manifest.json')
}

const I18N_HTML_INJECTIONS = new Set()

const staticFilesBase = Settings.cdn.web.host.replace(/\/$/, '')

const entrypoints = new Map(
  Object.entries(webpackManifest.entrypoints).map(
    ([entrypoint, entrypointSpec]) => [
      entrypoint,
      entrypointSpec.js.map(file => staticFilesBase + file)
    ]
  )
)

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
  app.locals.entrypointSources = entrypoint => entrypoints.get(entrypoint)
  app.locals.staticPath = path => staticFilesBase + path

  webRouter.use(function(req, res, next) {
    const actualRender = res.render
    res.render = function() {
      res.locals.translate = function(key, vars, components) {
        vars = vars || {}
        if (Settings.i18n.checkForHTMLInVars) {
          Object.entries(vars).forEach(([field, value]) => {
            if (pug.escape(value) !== value) {
              const violationsKey = key + field
              // do not flood the logs, log one sample per pod + key + field
              if (!I18N_HTML_INJECTIONS.has(violationsKey)) {
                logger.warn(
                  { key, field, value },
                  'html content in translations context vars'
                )
                I18N_HTML_INJECTIONS.add(violationsKey)
              }
            }
          })
        }
        vars.appName = Settings.appName
        const locale = req.i18n.translate(key, vars)
        if (components) {
          return SafeHTMLSubstitute.render(locale, components)
        } else {
          return locale
        }
      }
      res.locals.translate.has = req.i18n.translate.has

      res.locals.csrfToken = req.csrfToken()

      const currentUser = AuthenticationController.getSessionUser(req)
      res.locals.getLoggedInUserId = () => currentUser && currentUser._id
      res.locals.getSessionUser = () => currentUser
      res.locals.getUserEmail = () => currentUser && currentUser.email
      actualRender.apply(res, arguments)
    }
    next()
  })

  if (Settings.addResourceHints) {
    webRouter.use(getPreloadMiddleware(app))
  }
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
