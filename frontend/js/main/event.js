/* eslint-disable
    camelcase,
    max-len,
    no-return-assign,
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
import moment from 'moment'
import App from '../base'
import { localStorage } from '../modules/storage'
import getMeta from '../utils/meta'
const CACHE_KEY = 'mbEvents'
const isSAAS = getMeta('ol-isSAAS')

// keep track of how many heartbeats we've sent so we can calculate how
// long wait until the next one
let heartbeatsSent = 0
let nextHeartbeat = new Date()
App.factory('eventTracking', factory)
App.factory('eventTracking2', factory)

function factory($http) {
  if (!isSAAS) {
    return {
      enabled: false,
      send(category, action, label, value) {},
      sendGAOnce(category, action, label, value) {},
      editingSessionHeartbeat() {},
      sendMB(key, segmentation) {},
      sendMBSampled(key, segmentation, rate) {},
      sendMBOnce(key, segmentation) {},
      eventInCache(key) {},
    }
  }
  const _getEventCache = function () {
    let eventCache = localStorage(CACHE_KEY)

    // Initialize as an empy object if the event cache is still empty.
    if (eventCache == null) {
      eventCache = {}
      localStorage(CACHE_KEY, eventCache)
    }

    return eventCache
  }

  const _eventInCache = function (key) {
    const curCache = _getEventCache()
    return curCache[key] || false
  }

  const _addEventToCache = function (key) {
    const curCache = _getEventCache()
    curCache[key] = true

    return localStorage(CACHE_KEY, curCache)
  }

  const _sendEditingSessionHeartbeat = () =>
    $http({
      url: `/editingSession/${window.project_id}`,
      method: 'PUT',
      headers: {
        'X-CSRF-Token': window.csrfToken,
      },
    })

  return {
    enabled: true,

    send(category, action, label, value) {
      return ga('send', 'event', category, action, label, value)
    },

    sendGAOnce(category, action, label, value) {
      if (!_eventInCache(action)) {
        _addEventToCache(action)
        return this.send(category, action, label, value)
      }
    },

    editingSessionHeartbeat() {
      if (!(nextHeartbeat <= new Date())) {
        return
      }

      _sendEditingSessionHeartbeat()

      heartbeatsSent++

      // send two first heartbeats at 0 and 30s then increase the backoff time
      // 1min per call until we reach 5 min
      const backoffSecs =
        heartbeatsSent <= 2
          ? 30
          : heartbeatsSent <= 6
          ? (heartbeatsSent - 2) * 60
          : 300

      return (nextHeartbeat = moment().add(backoffSecs, 'seconds').toDate())
    },

    sendMB(key, segmentation) {
      if (segmentation == null) {
        segmentation = {}
      }
      fetch(`/event/${key}`, {
        method: 'POST',
        body: JSON.stringify(segmentation),
        keepalive: true,
        headers: {
          'X-CSRF-Token': window.csrfToken,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      })
    },

    sendMBSampled(key, segmentation, rate = 0.01) {
      if (Math.random() < rate) {
        this.sendMB(key, segmentation)
      }
    },

    sendMBOnce(key, segmentation) {
      if (!_eventInCache(key)) {
        _addEventToCache(key)
        this.sendMB(key, segmentation)
      }
    },

    eventInCache(key) {
      return _eventInCache(key)
    },
  }
}

if (isSAAS) {
  $('.navbar a').on('click', function (e) {
    const href = $(e.target).attr('href')
    if (href != null) {
      return ga('send', 'event', 'navigation', 'top menu bar', href)
    }
  })
}
