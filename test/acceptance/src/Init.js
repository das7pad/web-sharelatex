const App = require('../../../app.js')
const { exec } = require('child_process')
const { db } = require('../../../app/src/infrastructure/mongojs')

before(function(done) {
  this.timeout(30000)
  clearDB(() => {
    exec('bin/east migrate', (error, stdout, stderr) => {
      console.log(stdout)
      console.error(stderr)
      if (error) {
        throw error
      }
      App.listen(3000, 'localhost', done)
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
