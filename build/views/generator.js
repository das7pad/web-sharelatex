const pug = require('pug')

function generateModule({ path, debug }) {
  return (
    "const pug = require('pug-runtime'); module.exports = template; " +
    generateModuleInMemory({ path, debug }).toString()
  )
}

function generateModuleInMemory({ path, debug }) {
  const OL_META = new RegExp(`(^|\\b)meta\\(name=(["'])ol-`, 'g')
  return pug.compileFile(path, {
    plugins: [
      {
        // Mitigate Angular XSS globally
        preLex: src => {
          src = src.replace(OL_META, 'meta(ng-non-bindable name=$2ol-')
          return src
        },
      },
    ],
    cache: false,
    compileDebug: debug,
    doctype: 'html',
  })
}

module.exports = {
  generateModule,
  generateModuleInMemory,
}
