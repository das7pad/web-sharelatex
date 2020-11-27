const Settings =
  require('@overleaf/settings') || require('../../../config/settings.defaults')

let webpackManifest
if (Settings.useDevAssets) {
  webpackManifest = require('../../../public/manifest-dev.json')
} else {
  webpackManifest = require('../../../public/manifest.json')
}

const STATIC_FILES_BASE = Settings.cdn.web.host.replace(/\/$/, '')

const ENTRYPOINTS = new Map(
  Object.entries(webpackManifest.entrypoints).map(
    ([entrypoint, entrypointSpec]) => {
      return [entrypoint, entrypointSpec.js.map(staticPath)]
    }
  )
)

function buildCssPath(themeModifier = '') {
  return STATIC_FILES_BASE + webpackManifest[themeModifier + 'style.css']
}
function buildImgPath(path) {
  return STATIC_FILES_BASE + '/img/' + path
}
function buildJsPath(path) {
  return STATIC_FILES_BASE + webpackManifest[path]
}
function entrypointSources(entrypoint) {
  return ENTRYPOINTS.get(entrypoint)
}
function staticPath(path) {
  return STATIC_FILES_BASE + path
}

module.exports = {
  buildCssPath,
  buildImgPath,
  buildJsPath,
  entrypointSources,
  staticPath
}