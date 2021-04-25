import getMeta from '../utils/meta'
const algoliaConfig = getMeta('ol-sharelatex.algolia')

function load() {
  return import('algoliasearch').then(bundle => bundle.default)
}

let client
function getClient() {
  if (client) return client

  client = load()
    .then(AlgoliaSearch => {
      return AlgoliaSearch(algoliaConfig.app_id, algoliaConfig.api_key)
    })
    .catch(err => {
      client = undefined
      throw err
    })
  return client
}

const indexes = new Map()
function getIndex(idx) {
  return getClient().then(client => {
    if (indexes.has(idx)) return indexes.get(idx)

    const index = client.initIndex(algoliaConfig.indexes[idx])
    indexes.set(idx, index)
    return index
  })
}

function search(idx, query, options, cb) {
  if (!algoliaConfig) return
  if (!(idx in algoliaConfig.indexes)) return

  getIndex(idx)
    .then(index => {
      index.search(query, options, cb)
    })
    .catch(cb)
}

export function searchKB(query, options, cb) {
  search('kb', query, options, cb)
}
export function searchWiki(query, options, cb) {
  search('wiki', query, options, cb)
}
