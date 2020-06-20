/* eslint-disable
    max-len,
    no-unused-vars,
    no-use-before-define,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let SudoModeMiddleware
const logger = require('logger-sharelatex')
const SudoModeHandler = require('./SudoModeHandler')
const AuthenticationController = require('../Authentication/AuthenticationController')
const Settings = require('settings-sharelatex')
const Features = require('../../infrastructure/Features')

module.exports = SudoModeMiddleware = {
  protectPage(req, res, next) {
    if (
      Features.EXTERNAL_AUTHENTICATION_SYSTEM_USED &&
      Settings.overleaf == null
    ) {
      logger.log(
        { userId },
        '[SudoMode] using external auth, skipping sudo-mode check'
      )
      return next()
    }
    var userId = AuthenticationController.getLoggedInUserId(req)
    logger.log(
      { userId },
      '[SudoMode] protecting endpoint, checking if sudo mode is active'
    )
    return SudoModeHandler.isSudoModeActive(userId, function(err, isActive) {
      if (err != null) {
        logger.warn(
          { err, userId },
          '[SudoMode] error checking if sudo mode is active'
        )
        return next(err)
      }
      if (isActive) {
        logger.log({ userId }, '[SudoMode] sudo mode active, continuing')
        return next()
      } else {
        logger.log({ userId }, '[SudoMode] sudo mode not active, redirecting')
        AuthenticationController.setRedirectInSession(req)
        return res.redirect('/confirm-password')
      }
    })
  }
}
