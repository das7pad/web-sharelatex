const fs = require('fs')
const Path = require('path')

// Accumulate manifest artifacts from all builds
const manifest = {}
const ROOT = Path.dirname(__dirname)
const MANIFEST_PATH = Path.join(ROOT, 'public', 'manifest.json')

module.exports = async function(metafile) {
  const entrypoints = (manifest.entrypoints = manifest.entrypoints || {})

  function pathInPublic(path) {
    return path.slice('public'.length)
  }
  const loaders = ['less']
  function normalizeEntrypoint(blob) {
    if (loaders.some(loader => blob.startsWith(`${loader}:${ROOT}`))) {
      blob = Path.relative(ROOT, blob.replace(/.+?:/, ''))
    }
    return blob
  }

  const meta = JSON.parse(await fs.promises.readFile(metafile, 'utf-8'))

  Object.entries(meta.outputs)
    .filter(([path, details]) => details.entryPoint)
    .forEach(([path, details]) => {
      const src = normalizeEntrypoint(details.entryPoint)
      manifest[src] = pathInPublic(path)
      entrypoints[src] = details.imports
        .map(item => pathInPublic(item.path))
        .concat([pathInPublic(path)])
    })

  const assetFileTypes = ['.woff', '.woff2', '.png', '.svg', '.gif']
  Object.entries(meta.outputs)
    .filter(([path]) => assetFileTypes.some(ext => path.endsWith(ext)))
    .forEach(([path, details]) => {
      const src = Object.keys(details.inputs).pop()
      manifest[src] = pathInPublic(path)
    })

  await fs.promises.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2))
}
