import getMeta from './meta'

const base = getMeta('ol-staticPath', '/')

export default function staticPath(path) {
  return base + path
}

// eslint-disable-next-line camelcase, no-undef
__webpack_public_path__ = staticPath(__webpack_public_path__)
