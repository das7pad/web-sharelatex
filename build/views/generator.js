const pug = require('pug')

function generateModule({ path, cache, debug }) {
  return (
    "const pug = require('pug-runtime'); module.exports = template; " +
    generateModuleInMemory({ path, cache, debug }).toString()
  )
}

function generateModuleInMemory({ path, cache, debug }) {
  const OL_META = new RegExp('(^|\\b)meta\\(id="ol-', 'g')
  return pug.compileFile(path, {
    plugins: [
      {
        // Mitigate Angular XSS globally
        preLex: src => {
          src = src.replace(OL_META, 'meta(ng-non-bindable id="ol-')
          return src
        }
      }
    ],
    cache,
    compileDebug: debug,
    doctype: 'html'
  })
}

module.exports = {
  generateModule,
  generateModuleInMemory
}
