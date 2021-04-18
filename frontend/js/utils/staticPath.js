import getMeta from './meta'

const base = getMeta('ol-staticPath', '').replace(/\/$/, '')

export default function staticPath(path) {
  return base + path
}
