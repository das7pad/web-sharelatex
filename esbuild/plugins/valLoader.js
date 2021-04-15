module.exports = function(path) {
  return {
    name: 'valLoader@' + path,
    setup(build) {
      build.onLoad({ filter: new RegExp(path) }, function() {
        const { code: contents, watchDirs, watchFiles } = require(path)()
        return {
          contents,
          watchDirs,
          watchFiles,
          loader: 'js'
        }
      })
    }
  }
}
