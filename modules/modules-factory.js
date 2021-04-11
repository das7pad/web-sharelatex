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
  return function() {
    // Generate new listings on every invocation.
    const files = list(pattern)
    const parents = getAllParents(pattern)

    // Import relative to entrypoint. The output is _public_.
    const code = files.map(file => `import '${file}'`).join('\n')

    // Watch on absolute path.
    const watchDirs = toAbsolute(parents)
    const watchFiles = toAbsolute(files)
    return {
      code,
      watchDirs,
      watchFiles
    }
  }
}

module.exports = genLoaderTarget
