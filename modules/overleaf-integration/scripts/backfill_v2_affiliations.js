const {db} = require('../../../app/js/infrastructure/mongojs')
const minimist = require('minimist')
const InstitutionsAPI = require(
  '../../../app/js/Features/Institutions/InstitutionsAPI'
)

const async = require('async')
const logger = require('logger-sharelatex')
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
  async.mapSeries(user.emails, function (userEmail, innerCallback) {
    if (!userEmail.confirmedAt) innerCallback()
    confirmedEmails++
    InstitutionsAPI.addAffiliation(
      user._id,
      userEmail.email,
      {confirmedAt: userEmail.confirmedAt},
      function (error) {
        console.log('CONFIRMED EMAIL FOR', user._id, userEmail.email, user.signUpDate)
        if (error) console.error('ERROR', error)
        innerCallback()
      }
    )
  }, function (error) {
    if (error) throw error
    callback()
  })
}

var confirmedEmails = 0
const argv = minimist(process.argv.slice(2))

const asyncLimit = argv.async || 1
const startDate = argv.startDate || '2010-01-11'

db.users.find({
  'emails.confirmedAt': { $exists: true },
  'signUpDate': { $gte : new Date(startDate)}
}, {
  emails: 1,
  signUpDate: 1
}).sort({signUpDate: 1}, function (error, users) {
  if (error) throw error
  console.log('USER COUNT', users.length)
  async.mapLimit(users, asyncLimit, backfillUserWithRetries, function (error) {
    if (error) throw error
    console.log('CONFIRMED EMAILS:', confirmedEmails)
    console.log('FINISHED!')
    process.exit()
  })
})
