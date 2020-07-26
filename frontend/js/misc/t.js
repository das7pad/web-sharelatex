import getMeta from '../utils/meta'

const appName = getMeta('ol-appName')
export default function t(key, vars) {
  vars = vars || {}
  vars.appName = appName
  return window.t(key, vars)
}
