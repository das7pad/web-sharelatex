import App from '../base'
import AlgoliaSearch from 'algoliasearch'

export default App.factory('algoliaSearch', function() {
  let kbIdx, wikiIdx
  const algoliaConfig = window.sharelatex && window.sharelatex.algolia
  if (algoliaConfig && algoliaConfig.indexes && algoliaConfig.indexes.wiki) {
    const client = AlgoliaSearch(algoliaConfig.app_id, algoliaConfig.api_key)
    wikiIdx = client.initIndex(algoliaConfig.indexes.wiki)
    kbIdx = client.initIndex(algoliaConfig.indexes.kb)
  }

  // searchKB is deprecated
  return {
    searchWiki: wikiIdx ? wikiIdx.search.bind(wikiIdx) : null,
    searchKB: kbIdx ? kbIdx.search.bind(kbIdx) : null
  }
})
