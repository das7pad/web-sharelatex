const WEB_PATH = '../../..'

const {db} = require(`${WEB_PATH}/app/js/infrastructure/mongojs`)
const {request} = require('../app/js/V1SharelatexApi')
const UserMapper = require('../app/js/OverleafUsers/UserMapper')
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
  if (user.emails.length > 1) {
    console.log('ALREADY IMPORTED', user._id)
    return callback()
  }
  request({
    url: `${settings.apis.v1.url}/api/v1/sharelatex/users/${user.overleaf.id}/profile`,
  }, function (error, response, profile) {
    if (error) return callback(error)
    console.log('GOT PROFILE', JSON.stringify(profile, null, 2))
    UserMapper._addEmails(user, profile, callback)
  })
}

const argv = minimist(process.argv.slice(2))
const startId = argv.start || 0
const asyncLimit = argv.async || 1
db.users.find({
  'overleaf.id': { $exists: true },
  'overleaf.id': { $gt: startId },
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
