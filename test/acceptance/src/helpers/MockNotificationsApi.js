const express = require('express')
const app = express()

const MockNotificationsApi = {
  run() {
    app.get('/user/:user', (req, res) => {
      res.json([])
    })
    app.delete('/user/:user', (req, res) => {
      res.send()
    })
    app.delete('/user/:user/notifications/:notification', (req, res) => {
      res.send()
    })
    app.delete('/key/:key', (req, res) => {
      res.send()
    })

    app.listen(3042, (error) => {
      if (!error) return
      console.error('error starting MockNotificationsApi:', error.message)
      process.exit(1)
    })
  }
}

MockNotificationsApi.run()
module.exports = MockNotificationsApi
