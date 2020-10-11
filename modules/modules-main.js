const deps = require('glob').sync('./*/frontend/js/main/index.js', {
  cwd: __dirname
})

module.exports = function() {
  return {
    code: `define(${JSON.stringify(deps)}, function() {})`
  }
}
