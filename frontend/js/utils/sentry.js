import getMeta from './meta'
import staticPath from './staticPath'

if (getMeta('ol-sentry')) {
  import(/* webpackChunkName: "sentry" */ '@sentry/browser').then(Sentry => {
    let eventCount = 0

    const baseConfig = {
      whitelistUrls: [window.location.origin, staticPath('/')],

      ignoreErrors: [
        // Ignore very noisy error
        'SecurityError: Permission denied to access property "pathname" on cross-origin object'
      ],

      beforeSend(event) {
        // Limit number of events sent to Sentry to 100 events "per page load",
        // (i.e. the cap will be reset if the page is reloaded). This prevent
        // hitting their server-side event cap.
        eventCount++
        if (eventCount > 100) {
          return null // Block the event from sending
        } else {
          return event
        }
      }
    }
    Sentry.init(Object.assign(baseConfig, getMeta('ol-sentry')))

    Sentry.setUser({ id: getMeta('ol-user_id') })

    // Previously Raven added itself as a global, so we mimic that old behaviour
    window.Raven = Sentry
  })
}
