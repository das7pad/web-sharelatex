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
        Object.values(db).map(async collection => {
          if (collection === db.migrations) {
            // Do not clear the collection for tracking migrations.
            return
          }
          return collection.deleteMany({})
        })
      )
    })
  },
}
