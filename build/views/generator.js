const Path = require('path')
const pug = require('pug')

function generateModule({ view, cache, debug }) {
  return (
    "const pug = require('pug-runtime'); module.exports = template; " +
    generateModuleInMemory({ view, cache, debug }).toString()
  )
}

function generateModuleInMemory({ view, cache, debug }) {
  const file = Path.resolve(view + '.pug')
  return pug.compileFile(file, {
    cache,
    compileDebug: debug,
    doctype: 'html'
  })
}

module.exports = {
  generateModule,
  generateModuleInMemory
}
