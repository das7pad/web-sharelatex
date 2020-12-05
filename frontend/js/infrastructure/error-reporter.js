import getMeta from '../utils/meta'

if (getMeta('ol-sentry')) {
  import(/* webpackChunkName: "sentry" */ '@sentry/browser').then(Sentry => {
    let eventCount = 0

    const baseConfig = {
      // Ignore errors unless they come from our origins
      // Adapted from: https://docs.sentry.io/platforms/javascript/#decluttering-sentry
      whitelistUrls: [new RegExp(getMeta('ol-sentry').allowedOriginRegex)],

      ignoreErrors: [
        // Ignore very noisy error
        'SecurityError: Permission denied to access property "pathname" on cross-origin object',
        // Ignore unhandled error that is "expected" - see https://github.com/overleaf/issues/issues/3321
        /^Missing PDF/,
        // Ignore "expected" error from aborted fetch - see https://github.com/overleaf/issues/issues/3321
        /^AbortError/,
        // Ignore spurious error from Ace internals - see https://github.com/overleaf/issues/issues/3321
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications.'
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
