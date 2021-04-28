const fs = require('fs')
const Path = require('path')

// Accumulate manifest artifacts from all builds
const entrypoints = new Map()
const manifest = new Map([['entrypoints', entrypoints]])
const ROOT = Path.dirname(__dirname)
const MANIFEST_PATH = Path.join(ROOT, 'public', 'manifest.json')

module.exports = { writeManifest, manifest }
async function writeManifest(meta, inMemory) {
  if (!meta) return // some builds do not emit a metafile

  function pathInPublic(path) {
    return path.slice('public'.length)
  }
  Object.entries(meta.outputs)
    .filter(([, details]) => details.entryPoint)
    .forEach(([path, details]) => {
      const src = details.entryPoint

      // Load entrypoint individually
      manifest.set(src, pathInPublic(path))

      // Load entrypoint with chunks
      entrypoints.set(
        src,
        details.imports
          .filter(item => item.kind === 'import-statement')
          .map(item => pathInPublic(item.path))
          .concat([pathInPublic(path)])
      )

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
          manifest.set(src + '.css', pathInPublic(cssBundle))
        }
      }
    })

  const assetFileTypes = ['.woff', '.woff2', '.png', '.svg', '.gif']
  Object.entries(meta.outputs)
    .filter(([path]) => assetFileTypes.some(ext => path.endsWith(ext)))
    .forEach(([path, details]) => {
      const src = Object.keys(details.inputs).pop()
      manifest.set(src, pathInPublic(path))
    })

  if (inMemory) return
  await flushManifest()
}

// The web app is watching MANIFEST_PATH and immediately loads the contents
//  upon changes.
// A change could be truncating the file to 0 for a new write.
// We must write atomically to the MANIFEST_PATH in order to provide 100%
//  accurate reads.
// Use a simple queue for atomic writes.
let pendingWrite = Promise.resolve()

async function flushManifest() {
  pendingWrite = pendingWrite.finally(() => flushManifestAtomically())
  await pendingWrite
}

function serializeManifest(key, value) {
  if (value instanceof Map) {
    // Cast Map to Object.
    value = Object.fromEntries(value.entries())
  }
  if (Array.isArray(value)) {
    // Sort entries for reproducible builds.
    return value.sort()
  }
  if (typeof value === 'object') {
    // Sort entries for reproducible builds.
    return Object.fromEntries(Object.entries(value).sort())
  }
  return value
}

async function flushManifestAtomically() {
  const tmpPath = MANIFEST_PATH + '~'
  const blob = JSON.stringify(manifest, serializeManifest, 2)
  await fs.promises.writeFile(tmpPath, blob)
  await fs.promises.rename(tmpPath, MANIFEST_PATH)
}
