import getMeta from '../utils/meta'

const appName = getMeta('ol-appName')
export function t(key, vars) {
  vars = vars || {}
  vars.appName = appName
  return window.t(key, vars)
}
export default t
