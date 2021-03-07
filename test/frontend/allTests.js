const glob = require('glob')
const CTX = { cwd: __dirname }

module.exports = function() {
  return {
    code: []
      .concat(glob.sync('../../test/frontend/*/**/*.js', CTX))
      .concat(glob.sync('../../modules/*/test/frontend/**/*.js', CTX))
      .map(file => `import '${file}'`)
      .join('\n')
  }
}
