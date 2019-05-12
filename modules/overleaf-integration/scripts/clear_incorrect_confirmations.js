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
  console.log('TESTING USER', user._id)
  dbUpdates = {}
  user.emails.forEach((emailData, idx) => {
    if (!emailData.confirmedAt) return;
    if (emailData.confirmedAt > emailData.createdAt) return;
    dbUpdates[`emails.${idx}.confirmedAt`] = 1
  })
  if (Object.keys(dbUpdates).length === 0) return callback() // no updates
  console.log('UPDATING USER', user._id)
  db.users.update({ _id: user._id}, { $unset: dbUpdates }, callback)
}

const whereFunction = function() {
  return this.emails && this.emails.some( (email) => {
    return email.confirmedAt && email.confirmedAt < email.createdAt
  })
}

const argv = minimist(process.argv.slice(2))
const startId = argv.start || 0
const asyncLimit = argv.async || 1
db.users.find({ 
  'emails.confirmedAt': { $exists: true },
  $where: whereFunction.toString()
}, {
  emails: 1
}
).sort({ '_id': 1 }, function (error, users) {
  if (error) throw error
  console.log('USER COUNT', users.length)
  async.mapLimit(users, asyncLimit, backfillUserWithRetries, function (error) {
    if (error) throw error
    console.log('FINISHED!')
    process.exit()
  })
})
