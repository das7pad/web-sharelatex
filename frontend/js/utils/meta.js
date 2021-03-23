// integration plan
// ----------------
// - stage 1: preserve old window access
// - stage 2: refactor window.data access to getMeta()
// - stage 3: refactor window access to getMeta()
// - stage 4: delete convertMetaToWindowAttributes()
// ----------------
import _ from 'lodash'

// cache for parsed values
const cache = new Map()

export default function getMeta(name, fallback) {
  if (cache.has(name)) return cache.get(name)
  const element = document.querySelector(`meta[name="${name}"]`)
  if (!element) {
    return fallback
  }
  const plainTextValue = element.content
  let value
  switch (element.dataset.type) {
    case 'boolean':
      // in pug: content=false -> no content field
      // in pug: content=true  -> empty content field
      value = element.hasAttribute('content')
      break
    case 'json':
      if (!plainTextValue) {
        // JSON.parse('') throws
        value = undefined
      } else {
        value = JSON.parse(plainTextValue)
      }
      break
    default:
      value = plainTextValue
  }
  cache.set(name, value)
  return value
}

function convertMetaToWindowAttributes() {
  window.data = window.data || {}
  Array.from(document.querySelectorAll('meta[name^="ol-"]'))
    .map(element => element.name)
    // process short labels before long ones:
    // e.g. assign 'sharelatex' before 'sharelatex.templates'
    .sort()
    .forEach(nameWithNamespace => {
      const label = nameWithNamespace.slice('ol-'.length)
      _.set(window, label, getMeta(nameWithNamespace))
      _.set(window.data, label, getMeta(nameWithNamespace))
    })
}
convertMetaToWindowAttributes()
