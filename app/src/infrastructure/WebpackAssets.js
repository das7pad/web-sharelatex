const Settings =
  require('@overleaf/settings') || require('../../../config/settings.defaults')

// TODO: watch manifest
let manifest
if (Settings.useDevAssets) {
  manifest = toMap(require('../../../public/manifest-dev.json'))
} else {
  manifest = toMap(require('../../../public/manifest.json'))
}

const STATIC_FILES_BASE = Settings.cdn.web.host.replace(/\/$/, '')
const ENTRYPOINTS = new Map(
  Object.entries(manifest.get('entrypoints')).map(([entrypoint, childs]) => {
    return [entrypoint, childs.map(path => STATIC_FILES_BASE + path)]
  })
)

function toMap(obj) {
  return new Map(Object.entries(obj))
}

function buildCssPath(themeModifier = '') {
  const src = `frontend/stylesheets/${themeModifier}style.less`
  return STATIC_FILES_BASE + manifest.get(src)
}
function buildImgPath(path) {
  const src = `public/img/${path}`
  return STATIC_FILES_BASE + (manifest.get(src) || '/img/' + path)
}
function buildFontPath(file) {
  const src = `frontend/fonts/${file}`
  return STATIC_FILES_BASE + manifest.get(src)
}
function buildJsPath(path) {
  const src = `frontend/js/${path}`
  return STATIC_FILES_BASE + manifest.get(src)
}
function buildTPath(lng) {
  const src = `generated/lng/${lng}.js`
  return STATIC_FILES_BASE + manifest.get(src)
}
function entrypointSources(entrypoint) {
  return ENTRYPOINTS.get(entrypoint)
}
function staticPath(path) {
  return STATIC_FILES_BASE + path
}

module.exports = {
  buildCssPath,
  buildFontPath,
  buildImgPath,
  buildJsPath,
  buildTPath,
  entrypointSources,
  staticPath
}
