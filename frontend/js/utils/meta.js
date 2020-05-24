// integration plan
// ----------------
// - stage 1: preserve old window access
// - stage 2: refactor window.data access to getMeta()
// - stage 3: refactor window access to getMeta()
// - stage 4: delete convertMetaToWindowAttributes()
// ----------------

// cache for parsed values
const cache = new Map()

export default function getMeta(id, fallback) {
  if (cache.has(id)) return cache.get(id)
  const element = document.getElementById(id)
  if (!element) {
    return fallback
  }
  let value = element.content
  if (element.hasAttribute('data-boolean')) {
    // in pug: content=false -> no content field
    // in pug: content=true -> empty content field
    value = element.hasAttribute('content')
  } else if (element.hasAttribute('data-json')) {
    if (!value) {
      // JSON.parse('') throws
      value = undefined
    } else {
      value = JSON.parse(value)
    }
  }
  cache.set(id, value)
  return value
}

export function convertMetaToWindowAttributes() {
  window.data = {}
  Array.from(document.querySelectorAll('meta[id^="ol-"]'))
    .map(element => element.id)
    // process short labels before long ones:
    // e.g. assign 'sharelatex' before 'sharelatex.templates'
    .sort()
    .forEach(id => {
      const path = id.slice(3).split('.')
      const label = path.pop()
      const parent = path.reduce((container, field) => {
        return container[field]
      }, window)
      parent[label] = getMeta(id)
      window.data[label] = getMeta(id)
    })
}
convertMetaToWindowAttributes()
