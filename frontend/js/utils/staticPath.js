import meta from './meta'

const base = meta(
  'ol-staticPath',
  document.currentScript.src.split('/').reduceRight((url, component) => {
    if (component !== 'js' && !url) return ''
    if (component === 'js' && !url) return '/'
    // start concatenating as soon as we passed the 'js/' component
    if (url === '/') return component + '/'
    return component + '/' + url
  }, '')
)

export default function staticPath(path) {
  return base + path
}

// eslint-disable-next-line camelcase, no-undef
__webpack_public_path__ = staticPath(__webpack_public_path__)
