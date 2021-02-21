module.exports = function() {
  return {
    name: 'modulesLoader',
    setup(build) {
      build.onLoad({ filter: /modules[/]modules-\.js/ }, async args => {
        return {
          contents: require(args.path)().code,
          loader: 'js'
        }
      })
    }
  }
}
