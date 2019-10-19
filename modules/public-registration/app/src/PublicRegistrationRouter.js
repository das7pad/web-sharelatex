/* eslint-disable
    max-len,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const PublicRegistrationController = require('./PublicRegistrationController')
const AuthenticationController = require('../../../../app/js/Features/Authentication/AuthenticationController')
const CaptchaMiddleware = require('../../../../app/js/Features/Captcha/CaptchaMiddleware')
const Settings = require('settings-sharelatex')

const logger = require('logger-sharelatex')

module.exports = {
  apply(webRouter) {
    // This registration module has been superceeded by the work in
    // Overleaf integration, but we're not yet ready to rip this out,
    // because this is entangled with the acceptance tests.
    //
    // This option will be on for test runs
    if (Settings.enableLegacyRegistration) {
      removeRoute(webRouter, 'get', '/register')
      webRouter.get('/register', PublicRegistrationController.showRegisterPage)
      webRouter.post(
        '/register',
        CaptchaMiddleware.validateCaptcha('register'),
        PublicRegistrationController.register
      )
      return AuthenticationController.addEndpointToLoginWhitelist('/register')
    }
  }
}

var removeRoute = function(webRouter, method, path) {
  let index = null
  for (let i = 0; i < webRouter.stack.length; i++) {
    const route = webRouter.stack[i]
    if (
      __guard__(route != null ? route.route : undefined, x => x.path) === path
    ) {
      index = i
    }
  }
  if (index != null) {
    logger.log({ method, path, index }, 'removing route from express router')
    return webRouter.stack.splice(index, 1)
  }
}

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null
    ? transform(value)
    : undefined
}
