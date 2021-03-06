const Path = require('path')
const glob = require('glob')

function list(pattern) {
  return glob.sync(pattern, { cwd: __dirname })
}

function getAllParents(pattern) {
  let parents = []
  let parent = pattern
  // Walk the chain: ./*/frontend/js/main -> ... -> ./*/frontend -> ./* -> .
  while (parent !== '.') {
    parent = Path.dirname(parent)
    parents = parents.concat(list(Path.join(parent, '/')))
  }
  return parents
}

function toAbsolute(paths) {
  return paths.map(relativePath => Path.join(__dirname, relativePath))
}

function genLoaderTarget(pattern) {
  return function ({ isWatchMode }) {
    // Generate new listings on every invocation.
    const files = list(pattern)
    const parents = isWatchMode ? getAllParents(pattern) : []

    // Import relative to entrypoint. The output is _public_.
    const imports = files
      .map((file, id) => `import * as import${id} from '${file}'`)
      .join('\n')
    // Compose a consumable list of imports
    const defaultExport = `export default [\n${files
      .map((file, id) => `{ import: import${id}, path: '${file}' }`)
      .join(',\n')}\n]`
    const code = `${imports}\n${defaultExport}\n`

    // Watch on absolute path.
    const watchDirs = isWatchMode ? toAbsolute(parents) : undefined
    const watchFiles = isWatchMode ? toAbsolute(files) : undefined
    return {
      code,
      watchDirs,
      watchFiles,
    }
  }
}

module.exports = genLoaderTarget
