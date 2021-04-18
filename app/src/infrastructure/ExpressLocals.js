const Settings = require('@overleaf/settings')
const logger = require('logger-sharelatex')
const pug = require('pug-runtime')

const Features = require('./Features')
const AuthenticationController = require('../Features/Authentication/AuthenticationController')
const Modules = require('./Modules')
const SafeHTMLSubstitute = require('../Features/Helpers/SafeHTMLSubstitution')
const {
  buildCssPath,
  buildImgPath,
  buildJsPath,
  buildTPath,
  getEntrypointChunks,
  staticPath
} = require('./WebpackAssets')

const I18N_HTML_INJECTIONS = new Set()

module.exports = function (app, webRouter) {
  app.locals.EXTERNAL_AUTHENTICATION_SYSTEM_USED =
    Features.EXTERNAL_AUTHENTICATION_SYSTEM_USED
  app.locals.hasFeature = Features.hasFeature
  app.locals.moduleIncludes = Modules.moduleIncludes
  app.locals.moduleIncludesAvailable = Modules.moduleIncludesAvailable
  app.locals.settings = Settings

  app.locals.buildCssPath = buildCssPath
  app.locals.buildImgPath = buildImgPath
  app.locals.buildJsPath = buildJsPath
  app.locals.buildTPath = buildTPath
  app.locals.getEntrypointChunks = getEntrypointChunks
  app.locals.staticPath = staticPath

  app.locals.buildMathJaxEntrypoint = () => buildJsPath('MathJaxBundle.js')

  webRouter.use(function (req, res, next) {
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
}
