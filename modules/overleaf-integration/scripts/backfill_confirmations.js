const WEB_PATH = '../../..'

const {db} = require(`${WEB_PATH}/app/js/infrastructure/mongojs`)
const {request} = require('../app/js/V1SharelatexApi')
const async = require('async')
const settings = require('settings-sharelatex')
const logger = require('logger-sharelatex')
const minimist = require('minimist')
logger.logger.level('error')

backfillUserWithRetries = function (user, callback, tries = 0) {
  backfillUser(user, (error) => {
    if (!error) return callback()
    if (tries >= 3) return callback(error)
    tries++;
    console.log(`CAUTH "${error.message}". RETRYING (${tries} tries)`)
    setTimeout(() => { backfillUserWithRetries(user, callback, tries); }, 5000);
  });
}

backfillUser = function (user, callback) {
  console.log('BACKFILLING IN v2', user._id, user.overleaf.id)
  writeToV2(user, (error) => {
    if (error) return callback(error)
    writeToV1(user, callback)
  })
}

writeToV2 = function (user, callback) {
  hasUnconfirmedEmail = user.emails.some((emailData) => { return !emailData.confirmedAt })
  if (!hasUnconfirmedEmail) return callback() // no unconfirmed email

  path = `/api/v1/sharelatex/users/${user.overleaf.id}/profile`
  request({ url: `${settings.apis.v1.url}${path}` }, (error, _, profile) => {
    if (error) return callback(error)

    v1EmailsData = profile.affiliations || []
    v1EmailsData.push({ email: profile.email, confirmed_at: profile.confirmed_at })

    dbUpdates = {}
    user.emails.forEach((emailData, idx) => {
      v1EmailData = v1EmailsData.find((v1EmailData) => {
        return v1EmailData.email == emailData.email && v1EmailData.confirmed_at
      })
      if (!v1EmailData) return // email not confirmed in v1

      dbUpdates[`emails.${idx}.confirmedAt`] = v1EmailData.confirmed_at
    })
    if (Object.keys(dbUpdates).length === 0) return callback() // no updates

    db.users.update({ _id: user._id}, { $set: dbUpdates }, callback)
  })
}

writeToV1 = function (user, callback) {
  async.each(user.emails, ((emailData, asyncCallback) => {
    if (!emailData.confirmedAt) return asyncCallback() // email not confirmed

    path = `/api/v1/sharelatex/users/${user.overleaf.id}/confirm_email`
    request({
      url: `${settings.apis.v1.url}${path}`,
      method: 'POST',
      json: { user: { email: emailData.email } }
    }, asyncCallback)
  }), callback)
}

const argv = minimist(process.argv.slice(2))
const startId = argv.start || 0
const asyncLimit = argv.async || 1
db.users.find({
  'overleaf.id': { $exists: true },
  'overleaf.id': { $gt: startId }
}, {
  overleaf: 1,
  emails: 1
}
).sort({ 'overleaf.id': 1 }, function (error, users) {
  if (error) throw error
  console.log('USER COUNT', users.length)
  async.mapLimit(users, asyncLimit, backfillUserWithRetries, function (error) {
    if (error) throw error
    console.log('FINISHED!')
    process.exit()
  })
})
