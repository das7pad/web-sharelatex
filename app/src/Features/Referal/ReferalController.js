const ReferalHandler = require('./ReferalHandler')
const AuthenticationController = require('../Authentication/AuthenticationController')
const Settings = require('@overleaf/settings')

module.exports = {
  bonus(req, res, next) {
    const userId = AuthenticationController.getLoggedInUserId(req)
    ReferalHandler.getReferedUsers(
      userId,
      (err, referedUsers, referedUserCount) => {
        if (err) {
          next(err)
        } else {
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
            refered_users: referedUsers,
            refered_user_count: referedUserCount
          })
        }
      }
    )
  }
}
