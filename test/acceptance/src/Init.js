const { exec } = require('child_process')
const { waitForDb } = require('../../../app/src/infrastructure/mongodb')
const { db } = require('../../../app/src/infrastructure/mongojs')

before(waitForDb)

before(function(done) {
  this.timeout(60000)
  clearDB(() => {
    exec('bin/east migrate', (error, stdout, stderr) => {
      console.log(stdout)
      console.error(stderr)
      if (error) {
        throw error
      }
      if (process.env.HTTP_TEST_HOST) {
        done()
      } else {
        require('../../../app.js').listen(3000, 'localhost', done)
      }
    })
  })
})

afterEach(clearDB)

function clearDB(done) {
  db.getCollectionNames((error, names) => {
    if (error) {
      throw error
    }
    Promise.all(
      names.map(name => {
        return new Promise((resolve, reject) => {
          db[name].remove({}, err => {
            if (err) {
              reject(err)
            } else {
              resolve()
            }
          })
        })
      })
    ).then(
      () => done(),
      err => {
        throw err
      }
    )
  })
}
