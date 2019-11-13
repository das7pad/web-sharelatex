const deps = require('glob').sync(`${__dirname}/**/ide/index.js`)

module.exports = function() {
  return {
    code: `define(${JSON.stringify(deps)}, function() {})`
  }
}
