/* eslint-disable
    max-len,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let RedirectManager
const settings = require('@overleaf/settings')
const logger = require('logger-sharelatex')

module.exports = RedirectManager = {
  apply(webRouter) {
    let cdnUrl = settings.cdn.web.host
    if (cdnUrl) {
      // drop trailing slash
      cdnUrl = cdnUrl.replace(/\/$/, '')
      settings.redirects['/favicon.ico'] = cdnUrl + '/favicon.ico'
    }

    return (() => {
      const result = []
      for (var redirectUrl in settings.redirects) {
        var target = settings.redirects[redirectUrl]
        result.push(
          Array.from(target.methods || ['get']).map(method =>
            webRouter[method](
              redirectUrl,
              RedirectManager.createRedirect(target)
            )
          )
        )
      }
      return result
    })()
  },

  createRedirect(target) {
    return function (req, res, next) {
      let url
      if (
        (req.headers != null ? req.headers['x-skip-redirects'] : undefined) !=
        null
      ) {
        return next()
      }
      let code = 302
      if (typeof target === 'string') {
        url = target
      } else {
        if (req.method !== 'GET') {
          code = 307
        }

        if (typeof target.url === 'function') {
          url = target.url(req.params)
          if (!url) {
            return next()
          }
        } else {
          ;({ url } = target)
        }

        if (target.baseUrl != null) {
          url = `${target.baseUrl}${url}`
        }
      }
      return res.redirect(code, url + getQueryString(req))
    }
  },
  getQueryString,
}

// Naively get the query params string. Stringifying the req.query object may
// have differences between Express and Rails, so safer to just pass the raw
// string
function getQueryString(req) {
  return req.originalUrl.includes('?')
    ? req.originalUrl.slice(req.originalUrl.indexOf('?'))
    : ''
}
