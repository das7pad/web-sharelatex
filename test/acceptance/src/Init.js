const { exec } = require('child_process')
const { waitForDb, db } = require('../../../app/src/infrastructure/mongodb')

before(waitForDb)
before(clearDb)

before(function(done) {
  this.timeout(60000)
  exec('bin/east migrate', (error, stdout, stderr) => {
    console.log(stdout)
    console.error(stderr)
    if (error) {
      throw error
    }
    require('../../../app.js').listen(3000, 'localhost', done)
  })
})

afterEach(clearDb)

async function clearDb() {
  return Promise.all(
    Object.values(db).map(collection => collection.deleteMany({}))
  )
}
