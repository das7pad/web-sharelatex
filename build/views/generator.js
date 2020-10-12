const pug = require('pug')

function generateModule({ path, cache, debug }) {
  return (
    "const pug = require('pug-runtime'); module.exports = template; " +
    generateModuleInMemory({ path, cache, debug }).toString()
  )
}

function generateModuleInMemory({ path, cache, debug }) {
  return pug.compileFile(path, {
    cache,
    compileDebug: debug,
    doctype: 'html'
  })
}

module.exports = {
  generateModule,
  generateModuleInMemory
}
