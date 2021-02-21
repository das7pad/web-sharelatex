module.exports = function(path) {
  return {
    name: 'valLoader@' + path,
    setup(build) {
      build.onLoad({ filter: new RegExp(path) }, function() {
        return {
          contents: require(path)().code,
          loader: 'js'
        }
      })
    }
  }
}
