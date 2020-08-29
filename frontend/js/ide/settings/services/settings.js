/* eslint-disable
    camelcase,
    max-len,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import App from '../../../base'
import getMeta from '../../../utils/meta'

export default App.factory('settings', (ide, eventTracking) => ({
  saveSettings(data) {
    if (!getMeta('ol-user_id')) {
      // we do not persist settings for anonymous users
      return
    }

    // Tracking code.
    for (const key of Array.from(Object.keys(data))) {
      const changedSetting = key
      const changedSettingVal = data[key]
      eventTracking.sendMB('setting-changed', {
        changedSetting,
        changedSettingVal
      })
    }
    // End of tracking code.

    data._csrf = window.csrfToken
    return ide.$http.post('/user/settings', data)
  },

  saveProjectSettings(data) {
    data._csrf = window.csrfToken
    return ide.$http.post(`/project/${ide.project_id}/settings`, data)
  },

  saveProjectAdminSettings(data) {
    data._csrf = window.csrfToken
    return ide.$http.post(`/project/${ide.project_id}/settings/admin`, data)
  }
}))
