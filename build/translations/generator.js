const { getInflatedLocales } = require('./inflate')

function moduleGenerator(locales, inMemory, FIELDS, LOCALES) {
  // Browser and NodeJS compatible module
  // use ES5 syntax
  FIELDS = new RegExp('__(.+?)__', 'g')
  LOCALES = new Map()
  initMap(locales)
  locales = undefined // free asap

  function translate(key, vars) {
    vars = vars || {}
    return (LOCALES.get(key) || key).replace(FIELDS, function(field, label) {
      // fallback to no replacement
      // ('__appName__', 'appName') => vars['appName'] || '__appName__'
      return vars[label] || field
    })
  }
  translate.has = function has(key) {
    return LOCALES.has(key)
  }

  function initMap(iterable) {
    // IE11 does not have 'new Map(iterable)' support.
    // Fallback/Pony-fill to manual setting in all environments.
    iterable.forEach(function(keyLocalePair) {
      LOCALES.set.apply(LOCALES, keyLocalePair)
    })
  }

  if (typeof window !== 'undefined') {
    window.t = window.translate = translate
  } else if (inMemory) {
    return translate
  } else {
    module.exports = translate
  }
}

function generateModule(lng) {
  function serializeFunction(fn = function() {}) {
    return fn
      .toString()
      .replace(/\n\s+\/\/.+/g, '') // multi-line comment
      .replace(/ \/\/.+/g, '') // single line comment
  }

  // Browser and NodeJS compatible module
  // use ES5 syntax
  return `'use strict';
(${serializeFunction(moduleGenerator)}
)(${JSON.stringify(getInflatedLocales(lng))})
`
}

function generateModuleInMemory(lng) {
  return moduleGenerator(getInflatedLocales(lng), true)
}

module.exports = {
  generateModule,
  generateModuleInMemory
}
