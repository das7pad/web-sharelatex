/* eslint-disable
    camelcase,
    handle-callback-err,
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
const logger = require('logger-sharelatex')
const ReferalHandler = require('./ReferalHandler')
const AuthenticationController = require('../Authentication/AuthenticationController')
const Settings = require('settings-sharelatex')

module.exports = {
  bonus(req, res) {
    const user_id = AuthenticationController.getLoggedInUserId(req)
    return ReferalHandler.getReferedUsers(
      user_id,
      (err, refered_users, refered_user_count) => {
        const currentUser = AuthenticationController.getSessionUser(req)
        const referralId = currentUser && currentUser.referal_id
        res.locals.buildReferalUrl = function(referralMedium) {
          let url = Settings.siteUrl
          if (referralId) {
            // rs=b is Referral source = bonus
            url += `?r=${referralId}&rm=${referralMedium}&rs=b`
          }
          return url
        }
        res.render('referal/bonus', {
          title: 'bonus_please_recommend_us',
          refered_users,
          refered_user_count
        })
      }
    )
  }
}
