const { exec } = require('child_process')
const { waitForDb, db } = require('../../../../app/src/infrastructure/mongodb')

module.exports = {
  initialize() {
    before('waitForDb', waitForDb)

    before('migrate', function (done) {
      exec('bin/east migrate', done)
    })

    afterEach('clearDb', async function () {
      return Promise.all(
        Object.values(db).map(collection => collection.deleteMany({}))
      )
    })
  },
}
