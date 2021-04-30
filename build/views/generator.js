const pug = require('pug')

function generateModule({ path, debug }) {
  return (
    "const pug = require('pug-runtime'); module.exports = template; " +
    generateModuleInMemory({ path, debug }).toString()
  )
}

function generateModuleInMemory({ path, debug }) {
  return pug.compileFile(path, {
    cache: false,
    compileDebug: debug,
    doctype: 'html',
  })
}

module.exports = {
  generateModule,
  generateModuleInMemory,
}
