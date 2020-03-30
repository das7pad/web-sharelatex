const settings = require('settings-sharelatex')
const Errors = require('../Errors/Errors')
const httpProxy = require('express-http-proxy')

module.exports = {
  call(basePath) {
    if (!settings.apis.analytics || !settings.apis.analytics.enabled) {
      return (req, res, next) =>
        next(
          new Errors.ServiceNotConfiguredError(
            'Analytics service not configured'
          )
        )
    }

    return httpProxy(settings.apis.analytics.url, {
      proxyReqPathResolver(req) {
        return `${basePath}${req.path}`
      },
      proxyReqOptDecorator(proxyReqOpts, srcReq) {
        proxyReqOpts.headers = {} // unset all headers
        return proxyReqOpts
      }
    })
  }
}
