const {db} = require('../../../app/js/infrastructure/mongojs')
const minimist = require('minimist')
const UserUpdater = require(
  '../../../app/js/Features/User/UserUpdater'
)

const async = require('async')

var processedUsers = 0
const argv = minimist(process.argv.slice(2))
const asyncLimit = argv.async || 1

backfillUserEmailHostnames = function (user, callback) {
  processedUsers++
  async.mapSeries(user.emails, function (userEmail, innerCallback) {
    if (userEmail.reversedHostname) innerCallback()
    const reversedHostname =
      userEmail.email.split('@')[1].split('').reverse().join('')
    const query = {_id: user._id, 'emails.email': userEmail.email}
    const update = {$set: {'emails.$.reversedHostname': reversedHostname}}

    UserUpdater.updateUser(query, update, function (error, res) {
      console.log(
        'ADDING HOSTNAME FOR', user._id, userEmail.email, reversedHostname
      )
      if (error) return innerCallback(error)
      innerCallback()
    })
  }, function (error) {
    if (error) throw error
    callback()
  })
}

db.users.find({
  'emails.reversedHostname': {$exists: false}
}, {
  emails: 1
}, function (error, users) {
  if (error) throw error
  console.log('UNPROCESSED USER COUNT', users.length)
  async.mapLimit(
    users, asyncLimit, backfillUserEmailHostnames, function (error) {
      if (error) throw error
      console.log('PROCESSED USERS:', processedUsers)
      console.log('FINISHED!')
      process.exit()
    }
  )
})
