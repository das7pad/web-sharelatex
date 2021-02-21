const Path = require('path')
const FRONTEND_PATH = Path.join(__dirname, '../frontend')

module.exports = function(aliases) {
  return {
    name: 'aliasResolver',
    setup(build) {
      Object.entries(aliases).forEach(([src, dest]) => {
        const filter = new RegExp(`^${src}/`)
        build.onResolve({ filter }, args => {
          return { path: args.path.replace(filter, dest) }
        })
      })
    }
  }
}
