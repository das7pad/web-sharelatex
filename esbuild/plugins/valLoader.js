module.exports = function (pattern) {
  return {
    name: 'valLoader@' + pattern,
    setup(build) {
      build.onLoad({ filter: new RegExp(pattern) }, function (args) {
        const { code: contents, watchDirs, watchFiles } = require(args.path)({
          isWatchMode: !!build.initialOptions.watch,
        })
        return {
          contents,
          watchDirs,
          watchFiles,
          loader: 'js',
        }
      })
    },
  }
}
