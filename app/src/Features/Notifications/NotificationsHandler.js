/* eslint-disable
    camelcase,
    max-len,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const jwt = require('jsonwebtoken')
const OError = require('@overleaf/o-error')
const settings = require('@overleaf/settings')
const request = require('request')
const requestRetry = require('requestretry').defaults({
  maxAttempts: 3,
  retryDelay: 10
})
const logger = require('logger-sharelatex')

const oneSecond = 1000

const makeRequest = function (opts, callback) {
  if (
    (settings.apis.notifications != null
      ? settings.apis.notifications.url
      : undefined) == null
  ) {
    return callback(null, { statusCode: 200 })
  } else if (opts.method === 'GET') {
    return requestRetry(opts, callback)
  } else {
    return request(opts, callback)
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

  getUserNotifications(user_id, callback) {
    const opts = {
      uri: `${
        settings.apis.notifications != null
          ? settings.apis.notifications.url
          : undefined
      }/user/${user_id}`,
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
          statusCode
        })
      }
      if (err) {
        logger.err({ err }, 'something went wrong getting notifications')
        return callback(null, [])
      } else {
        if (unreadNotifications == null) {
          unreadNotifications = []
        }
        return callback(null, unreadNotifications)
      }
    })
  },

  createNotification(
    user_id,
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
    if (expiryDateTime != null) {
      payload.expires = expiryDateTime
    }
    const opts = {
      uri: `${
        settings.apis.notifications != null
          ? settings.apis.notifications.url
          : undefined
      }/user/${user_id}`,
      timeout: oneSecond,
      method: 'POST',
      json: payload,
    }
    return makeRequest(opts, callback)
  },

  markAsReadWithKey(user_id, key, callback) {
    const opts = {
      uri: `${
        settings.apis.notifications != null
          ? settings.apis.notifications.url
          : undefined
      }/user/${user_id}`,
      method: 'DELETE',
      timeout: oneSecond,
      json: {
        key,
      },
    }
    return makeRequest(opts, callback)
  },

  markAsRead(user_id, notification_id, callback) {
    const opts = {
      method: 'DELETE',
      uri: `${
        settings.apis.notifications != null
          ? settings.apis.notifications.url
          : undefined
      }/user/${user_id}/notification/${notification_id}`,
      timeout: oneSecond,
    }
    return makeRequest(opts, callback)
  },

  // removes notification by key, without regard for user_id,
  // should not be exposed to user via ui/router
  markAsReadByKeyOnly(key, callback) {
    const opts = {
      uri: `${
        settings.apis.notifications != null
          ? settings.apis.notifications.url
          : undefined
      }/key/${key}`,
      method: 'DELETE',
      timeout: oneSecond,
    }
    return makeRequest(opts, callback)
  },
}
