const WEB_PATH = '../../..'

const {db} = require(`${WEB_PATH}/app/js/infrastructure/mongojs`)
const {request} = require('../app/js/V1SharelatexApi')
const UserMapper = require('../app/js/OverleafUsers/UserMapper')
const async = require('async')
const minimist = require('minimist')
const settings = require('settings-sharelatex')

var processedUsers = 0
const argv = minimist(process.argv.slice(2))
const asyncLimit = argv.async || 1
const startId = argv.startid || 1

db.users.find({
  'overleaf.id': { $exists: true },
  'overleaf.id': { $gte: startId }
}, {
  'overleaf.id': 1,
  'refered_users': 1,
  'refered_user_count': 1
}).sort({ 'overleaf.id': 1 }, function (error, users) {
  if (error) throw error
  console.log('*** Users to process:', users.length)
  async.mapLimit(users, asyncLimit, backfillReferrals, function (error) {
    console.log('*** Terminating. Processed users: ' + processedUsers)
    if (error) throw error
    console.log('*** Finished :-)')
    process.exit()
  })
})

function backfillReferrals (user, callback) {
  let refered_users = user.refered_users || []
  let refered_user_count = user.refered_user_count || 0

  if (refered_users.length == refered_user_count) {
    console.log(`*** Getting referrals for user: ${user._id} -> ${user.overleaf.id}`)
    request({
      url: `${settings.overleaf.host}/api/v1/sharelatex/users/${user.overleaf.id}/profile`
    }, function(error, res, body) {
      processedUsers += 1
      if (error && error.statusCode == 404) {
        console.log(`*** WARN: v1 user not found for ${user._id} -> ${user.overleaf.id}`)
        callback()
      } else {
        if (error) throw error
        UserMapper._addReferedUserCount(user, body, callback)
      }
    })
  } else {
    processedUsers += 1
    callback()
  }
}
