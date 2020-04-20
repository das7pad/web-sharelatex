/* eslint-disable
    camelcase,
    max-len,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let OpenInOverleafMiddleware
const Csrf = require('../../../../app/src/infrastructure/Csrf')
const Path = require('path')
const querystring = require('querystring')
const AuthenticationController = require('../../../../app/src/Features/Authentication/AuthenticationController')

// middleware to accept an external request and redirect to it via a gateway that adds a csrf token. Will also
// redirect via the login page if the user is not authenticated.

module.exports = OpenInOverleafMiddleware = {
  middleware(req, res, next) {
    if (!AuthenticationController.isUserLoggedIn(req)) {
      AuthenticationController.setRedirectInSession(req)
      return OpenInOverleafMiddleware._renderGateway(
        req,
        'store',
        '/login?',
        res
      )
    }

    return Csrf.validateRequest(req, function (csrf_valid) {
      if (req.method === 'POST' && csrf_valid) {
        return next()
      }

      return OpenInOverleafMiddleware._renderGateway(req, 'submit', null, res)
    })
  },

  _renderGateway(req, action, target, res) {
    // action should be:
    // - submit, render the gateway page to resubmit with a csrf token
    // - store, render the gateway page to copy the params to local storage and redirect to the target url
    return res.render(Path.resolve(__dirname, '../views/gateway'), {
      form_data: req.method === 'GET' ? req.query : req.body,
      action,
      target
    })
  }
}
