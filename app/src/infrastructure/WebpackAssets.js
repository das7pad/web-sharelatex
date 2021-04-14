const fs = require('fs')
const Path = require('path')
const logger = require('logger-sharelatex')
const Settings = require('@overleaf/settings')

const MANIFEST_PATH = Path.join(
  __dirname,
  Settings.useDevAssets
    ? '../../../public/manifest-dev.json'
    : '../../../public/manifest.json'
)
const STATIC_FILES_BASE = Settings.cdn.web.host.replace(/\/$/, '')
let MANIFEST
let ENTRYPOINT_CHUNKS

function inflateEntrypointChunks(entryPointsWithRelativeChunkPaths) {
  ENTRYPOINT_CHUNKS = new Map(
    Object.entries(entryPointsWithRelativeChunkPaths).map(
      ([entrypoint, chunks]) => {
        return [entrypoint, chunks.map(staticPath)]
      }
    )
  )
}
function inflateManifest(blob) {
  MANIFEST = new Map(Object.entries(JSON.parse(blob)))

  inflateEntrypointChunks(MANIFEST.get('entrypoints'))
  MANIFEST.delete('entrypoints')
}

async function readManifest() {
  try {
    const blob = await fs.promises.readFile(MANIFEST_PATH, 'utf-8')
    inflateManifest(blob)
    logger.warn('manifest updated')
  } catch (err) {
    logger.warn({ err }, 'could not update manifest, serving outdated content')
  }
}
function watchManifest() {
  const MANIFEST_PARENT = Path.dirname(MANIFEST_PATH)
  const MANIFEST_NAME = Path.basename(MANIFEST_PATH)
  let pendingRead = Promise.resolve()

  fs.watch(MANIFEST_PARENT, (eventType, fileName) => {
    const isAtomicManifestWrite =
      eventType === 'rename' && fileName === MANIFEST_NAME
    if (!isAtomicManifestWrite) return

    // Use a simple queue for reads to avoid a race-condition with slow reads
    //  getting overtaken by fast ones leading to a stale manifest when the
    //  slow read eventually yields.
    pendingRead = pendingRead.finally(() => readManifest())
  })
}

inflateManifest(fs.readFileSync(MANIFEST_PATH, 'utf-8'))
if (Settings.watchManifest) {
  watchManifest()
}

function buildCssPath(themeModifier = '') {
  const src = `frontend/stylesheets/${themeModifier}style.less`
  return STATIC_FILES_BASE + MANIFEST.get(src)
}
function buildImgPath(path) {
  const src = `public/img/${path}`
  return STATIC_FILES_BASE + (MANIFEST.get(src) || '/img/' + path)
}
function buildFontPath(file) {
  const src = `frontend/fonts/${file}`
  return STATIC_FILES_BASE + MANIFEST.get(src)
}
function buildJsPath(path) {
  const src = `frontend/js/${path}`
  return STATIC_FILES_BASE + MANIFEST.get(src)
}
function buildTPath(lng) {
  const src = `generated/lng/${lng}.js`
  return STATIC_FILES_BASE + MANIFEST.get(src)
}
function getEntrypointChunks(entrypoint) {
  return ENTRYPOINT_CHUNKS.get(entrypoint)
}
function staticPath(path) {
  return STATIC_FILES_BASE + path
}

module.exports = {
  STATIC_FILES_BASE,
  buildCssPath,
  buildFontPath,
  buildImgPath,
  buildJsPath,
  buildTPath,
  getEntrypointChunks,
  staticPath
}
