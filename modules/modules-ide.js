const deps = require('glob').sync(`${__dirname}/*/frontend/js/ide/index.js`)

module.exports = function () {
  return {
    code: `define(${JSON.stringify(deps)}, function() {})`
  }
}
