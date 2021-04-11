const fs = require('fs')
const Path = require('path')

// Accumulate manifest artifacts from all builds
const entrypoints = {}
const manifest = { entrypoints }
const ROOT = Path.dirname(__dirname)
const MANIFEST_PATH = Path.join(ROOT, 'public', 'manifest.json')

module.exports = writeManifest
async function writeManifest(meta) {
  if (!meta) return // some builds do not emit a metafile

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

  Object.entries(meta.outputs)
    .filter(([, details]) => details.entryPoint)
    .forEach(([path, details]) => {
      const src = normalizeEntrypoint(details.entryPoint)

      // Load entrypoint individually
      manifest[src] = pathInPublic(path)

      // Load entrypoint with chunks
      entrypoints[src] = details.imports
        .map(item => pathInPublic(item.path))
        .concat([pathInPublic(path)])

      // Optionally provide access to extracted css
      if (path.endsWith('.js')) {
        // Match ide-HASH1.js with ide-HASH2.css
        const prefix = path.replace(/(.+-)\w+\.js$/, '$1')
        const cssBundle = Object.keys(meta.outputs).find(
          candidatePath =>
            candidatePath.startsWith(prefix) &&
            candidatePath.endsWith('.css') &&
            candidatePath.slice(prefix.length).match(/^\w+\.css$/)
        )
        if (cssBundle) {
          manifest[src + '.css'] = pathInPublic(cssBundle)
        }
      }
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
