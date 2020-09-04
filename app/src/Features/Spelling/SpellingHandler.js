const jwt = require('jsonwebtoken')
const request = require('request')
const requestRetry = require('requestretry').defaults({
  maxAttempts: 3,
  retryDelay: 10
})
const Settings = require('settings-sharelatex')
const OError = require('@overleaf/o-error')

const TIMEOUT = 10 * 1000

module.exports = {
  getJWT(userId, callback) {
    jwt.sign(
      { userId },
      Settings.jwt.spelling.sign.secret,
      Settings.jwt.spelling.sign.options,
      callback
    )
  },

  getUserDictionary(userId, callback) {
    const url = `${Settings.apis.spelling.url}/v20200714/user/${userId}`
    requestRetry.get({ url: url, timeout: TIMEOUT }, (error, response) => {
      if (error) {
        return callback(
          OError.tag(error, 'error getting user dictionary', { error, userId })
        )
      }

      if (response.statusCode < 200 || response.statusCode >= 300) {
        return callback(
          new OError(
            'Non-success code from spelling API when getting user dictionary',
            { userId, statusCode: response.statusCode }
          )
        )
      }

      callback(null, JSON.parse(response.body))
    })
  },

  deleteWordFromUserDictionary(userId, word, callback) {
    const url = `${Settings.apis.spelling.url}/v20200714/user/${userId}/unlearn`
    request.post(
      {
        url: url,
        json: {
          word
        },
        timeout: TIMEOUT
      },
      (error, response) => {
        if (error) {
          return callback(
            OError.tag(error, 'error deleting word from user dictionary', {
              userId,
              word
            })
          )
        }

        if (response.statusCode < 200 || response.statusCode >= 300) {
          return callback(
            new OError(
              'Non-success code from spelling API when removing word from user dictionary',
              { userId, word, statusCode: response.statusCode }
            )
          )
        }

        callback()
      }
    )
  },

  deleteUserDictionary(userId, callback) {
    const url = `${Settings.apis.spelling.url}/v20200714/user/${userId}`
    request.delete({ url: url, timeout: TIMEOUT }, (error, response) => {
      if (error) {
        return callback(
          OError.tag(error, 'error deleting user dictionary', { userId })
        )
      }

      if (response.statusCode < 200 || response.statusCode >= 300) {
        return callback(
          new OError(
            'Non-success code from spelling API when removing user dictionary',
            { userId, statusCode: response.statusCode }
          )
        )
      }

      callback()
    })
  }
}
