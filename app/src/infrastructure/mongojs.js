/* eslint-disable
    max-len,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
const Settings = require('settings-sharelatex')
const mongojs = require('mongojs')

if (process.env.OL_MOCHA_UNIT_TEST_ARE_RUNNING) {
  // set by -> test/unit/bootstrap.js
  throw new Error(
    'It looks like unit tests are running, but you are connecting to Mongo. Missing a stub?'
  )
}

const db = mongojs(Settings.mongo.url, [
  'projects',
  'users',
  'tokens',
  'docSnapshots',
  'projectHistoryFailures',
  'deletedProjects'
])
module.exports = {
  db,
  ObjectId: mongojs.ObjectId
}
