const jwt = require('jsonwebtoken')
const OError = require('@overleaf/o-error')
const settings = require('@overleaf/settings')
const request = require('request')
const requestRetry = require('requestretry').defaults({
  maxAttempts: 3,
  retryDelay: 10,
})
const logger = require('logger-sharelatex')
const _ = require('lodash')

const notificationsApi = _.get(settings, ['apis', 'notifications', 'url'])
const oneSecond = 1000

const makeRequest = function (opts, callback) {
  if (notificationsApi) {
    request(opts, callback)
  } else if (opts.method === 'GET') {
    return requestRetry(opts, callback)
  } else {
    callback(null, { statusCode: 200 })
  }
}

module.exports = {
  getJWT(userId, callback) {
    jwt.sign(
      { userId },
      settings.jwt.notifications.sign.secret,
      settings.jwt.notifications.sign.options,
      callback
    )
  },

  getUserNotifications(userId, callback) {
    const opts = {
      uri: `${notificationsApi}/user/${userId}`,
      json: true,
      timeout: oneSecond,
      method: 'GET',
    }
    return makeRequest(opts, function (err, res, unreadNotifications) {
      const statusCode = res != null ? res.statusCode : 500
      if (err) {
        OError.tag(err, 'something went wrong getting notifications')
      } else if (statusCode !== 200) {
        err = new OError('non success statusCode from notifications', {
          statusCode,
        })
      }
      if (err) {
        logger.err({ err }, 'something went wrong getting notifications')
        callback(null, [])
      } else {
        if (unreadNotifications == null) {
          unreadNotifications = []
        }
        callback(null, unreadNotifications)
      }
    })
  },

  createNotification(
    userId,
    key,
    templateKey,
    messageOpts,
    expiryDateTime,
    forceCreate,
    callback
  ) {
    if (!callback) {
      callback = forceCreate
      forceCreate = true
    }
    const payload = {
      key,
      messageOpts,
      templateKey,
      forceCreate,
    }
    if (expiryDateTime) {
      payload.expires = expiryDateTime
    }
    const opts = {
      uri: `${notificationsApi}/user/${userId}`,
      timeout: oneSecond,
      method: 'POST',
      json: payload,
    }
    makeRequest(opts, callback)
  },

  markAsReadWithKey(userId, key, callback) {
    const opts = {
      uri: `${notificationsApi}/user/${userId}`,
      method: 'DELETE',
      timeout: oneSecond,
      json: {
        key,
      },
    }
    makeRequest(opts, callback)
  },

  markAsRead(userId, notificationId, callback) {
    const opts = {
      method: 'DELETE',
      uri: `${notificationsApi}/user/${userId}/notification/${notificationId}`,
      timeout: oneSecond,
    }
    makeRequest(opts, callback)
  },

  // removes notification by key, without regard for user_id,
  // should not be exposed to user via ui/router
  markAsReadByKeyOnly(key, callback) {
    const opts = {
      uri: `${notificationsApi}/key/${key}`,
      method: 'DELETE',
      timeout: oneSecond,
    }
    makeRequest(opts, callback)
  },
}
