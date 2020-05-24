import getMeta from '../utils/meta'

if (!getMeta('ol-gaToken')) {
  window.ga = function() {
    console.log('would send to GA', arguments)
  }
}
