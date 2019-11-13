/* eslint-disable
    max-len,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const OpenInOverleafController = require('./OpenInOverleafController')
const OpenInOverleafMiddleware = require('./OpenInOverleafMiddleware')
const OpenInOverleafErrorController = require('./OpenInOverleafErrorController')
const RateLimiterMiddleware = require('../../../../app/src/Features/Security/RateLimiterMiddleware')

module.exports = {
  apply(webRouter) {
    webRouter.csrf.disableDefaultCsrfProtection('/docs', 'POST')
    webRouter.get(
      '/docs',
      OpenInOverleafMiddleware.middleware,
      OpenInOverleafController.openInOverleaf,
      OpenInOverleafErrorController.handleError
    )
    webRouter.post(
      '/docs',
      OpenInOverleafMiddleware.middleware,
      RateLimiterMiddleware.rateLimit({
        endpointName: 'open-in-overleaf',
        maxRequests: 20,
        timeInterval: 60
      }),
      OpenInOverleafController.openInOverleaf,
      OpenInOverleafErrorController.handleError
    )

    return webRouter.get('/devs', OpenInOverleafController.showDocumentation)
  }
}
