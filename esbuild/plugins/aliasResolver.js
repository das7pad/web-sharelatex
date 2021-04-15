module.exports = function(aliases) {
  return {
    name: 'aliasResolver',
    setup(build) {
      Object.entries(aliases).forEach(([src, dest]) => {
        const filter = new RegExp(`^${src}/`)
        build.onResolve({ filter }, args => {
          return { path: dest + args.path.replace(filter, '/') + '.js' }
        })
      })
    }
  }
}
