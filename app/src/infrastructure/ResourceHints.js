const Settings =
  require('@overleaf/settings') || require('../../../config/settings.defaults')
const {
  buildCssPath,
  buildFontPath,
  buildImgPath,
  buildJsPath,
} = require('./WebpackAssets')

const HAS_MULTIPLE_LANG = Object.keys(Settings.i18n.subdomainLang).length > 1

module.exports = function (app, webRouter) {
  if (Settings.addResourceHints) {
    webRouter.use(getPreloadMiddleware(app))
  }
}

function getPreloadMiddleware() {
  function generatePreloadLink(cfg) {
    const resourceHints = []
    function preload(uri, as, crossorigin) {
      resourceHints.push({ rel: 'preload', uri, as, crossorigin })
    }
    function preloadCss(themeModifier) {
      preload(buildCssPath(themeModifier), 'style')
    }
    function preloadFont(name) {
      // IE11 and Opera Mini are the only browsers that do not support WOFF 2.0
      //  https://caniuse.com/#search=woff2
      // They both ignore the preload header, so this is OK
      //  https://caniuse.com/#search=preload
      const uri = buildFontPath(`${name}.woff2`)
      preload(uri, 'font', true)
    }
    function preloadImg(path) {
      preload(buildImgPath(path), 'image')
    }

    if (cfg.usesBoldItalicFont) {
      preloadFont('merriweather-v21-latin-700italic')
    }

    if (cfg.isEditor) {
      preloadCss(cfg.themeModifier)
      preload(buildJsPath('ide.js.css'), 'style')
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
        'merriweather-v21-latin-regular',
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
  const PRELOAD_DASHBOARD = generatePreloadLink({ usesBoldItalicFont: true })
  const PRELOAD_EDITOR_DEFAULT = generatePreloadLink({
    isEditor: true,
    themeModifier: '',
  })
  const PRELOAD_EDITOR_IEEE = generatePreloadLink({
    isEditor: true,
    themeModifier: 'ieee-',
  })
  const PRELOAD_EDITOR_LIGHT = generatePreloadLink({
    isEditor: true,
    themeModifier: 'light-',
  })
  const PRELOAD_PASSWORD_RESET = generatePreloadLink({
    usesBoldItalicFont: true,
  })

  return function preloadMiddleware(req, res, next) {
    const actualRender = res.render
    res.render = function (view, locals, cb) {
      let headerValue
      switch (view) {
        case 'project/list':
          headerValue = PRELOAD_DASHBOARD
          break
        case 'project/editor':
          if (locals.themeModifier === 'ieee-') {
            headerValue = PRELOAD_EDITOR_IEEE
          } else if (locals.themeModifier === 'light-') {
            headerValue = PRELOAD_EDITOR_LIGHT
          } else {
            headerValue = PRELOAD_EDITOR_DEFAULT
          }
          break
        case 'user/passwordReset':
          headerValue = PRELOAD_PASSWORD_RESET
          break
        default:
          headerValue = PRELOAD_DEFAULT
      }
      res.setHeader('Link', headerValue)
      actualRender.call(res, view, locals, cb)
    }
    next()
  }
}
