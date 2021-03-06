const BetaProgramHandler = require('./BetaProgramHandler')
const OError = require('@overleaf/o-error')
const UserGetter = require('../User/UserGetter')
const Settings = require('@overleaf/settings')
const logger = require('logger-sharelatex')
const AsyncFormHelper = require('../Helpers/AsyncFormHelper')
const AuthenticationController = require('../Authentication/AuthenticationController')

const BetaProgramController = {
  optIn(req, res, next) {
    const userId = AuthenticationController.getLoggedInUserId(req)
    logger.log({ userId }, 'user opting in to beta program')
    if (userId == null) {
      return next(new Error('no user id in session'))
    }
    BetaProgramHandler.optIn(userId, function (err) {
      if (err) {
        return next(err)
      }
      AsyncFormHelper.redirect(req, res, '/beta/participate')
    })
  },

  optOut(req, res, next) {
    const userId = AuthenticationController.getLoggedInUserId(req)
    logger.log({ userId }, 'user opting out of beta program')
    if (userId == null) {
      return next(new Error('no user id in session'))
    }
    BetaProgramHandler.optOut(userId, function (err) {
      if (err) {
        return next(err)
      }
      AsyncFormHelper.redirect(req, res, '/beta/participate')
    })
  },

  optInPage(req, res, next) {
    const userId = AuthenticationController.getLoggedInUserId(req)
    logger.log({ user_id: userId }, 'showing beta participation page for user')
    UserGetter.getUser(userId, { betaProgram: 1 }, function (err, user) {
      if (err) {
        OError.tag(err, 'error fetching user', {
          userId,
        })
        return next(err)
      }
      res.render('beta_program/opt_in', {
        title: 'sharelatex_beta_program',
        user,
        languages: Settings.languages,
      })
    })
  },
}

module.exports = BetaProgramController
