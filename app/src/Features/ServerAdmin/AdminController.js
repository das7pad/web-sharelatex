/* eslint-disable
    camelcase,
    handle-callback-err,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

const metrics = require('@overleaf/metrics')
const logger = require('logger-sharelatex')
const AsyncFormHelper = require('../Helpers/AsyncFormHelper')
const DocumentUpdaterHandler = require('../DocumentUpdater/DocumentUpdaterHandler')
const Settings = require('settings-sharelatex')
const TpdsUpdateSender = require('../ThirdPartyDataStore/TpdsUpdateSender')
const TpdsProjectFlusher = require('../ThirdPartyDataStore/TpdsProjectFlusher')
const EditorRealTimeController = require('../Editor/EditorRealTimeController')
const SystemMessageManager = require('../SystemMessages/SystemMessageManager')

const httpSockets = require('http').globalAgent.sockets
const httpsSockets = require('https').globalAgent.sockets
function getTotalSocketCount(tracking) {
  return Object.values(tracking).reduce((n, sockets) => n + sockets.length, 0)
}
function serializeTracking(tracking, prefix) {
  return Object.fromEntries(
    Object.entries(tracking).map(([host, sockets]) => {
      // this will produce: ['http://1.2.3.4:8080:', ['/path', '/other/path']]
      return [prefix + host, sockets.map(socket => socket._httpMessage.path)]
    })
  )
}
function updateOpenConnectionsMetrics() {
  metrics.gauge('open_connections.http', getTotalSocketCount(httpSockets))
  metrics.gauge('open_connections.https', getTotalSocketCount(httpsSockets))
}
setInterval(updateOpenConnectionsMetrics, Settings.prometheusScrapeInterval)

const AdminController = {
  index: (req, res, next) => {
    const openSockets = {}
    Object.assign(openSockets, serializeTracking(httpSockets, 'http://'))
    Object.assign(openSockets, serializeTracking(httpsSockets, 'https://'))

    return SystemMessageManager.getMessagesFromDB(function(
      error,
      systemMessages
    ) {
      if (error != null) {
        return next(error)
      }
      return res.render('admin/index', {
        title: 'System Admin',
        openSockets,
        systemMessages
      })
    })
  },

  registerNewUser(req, res, next) {
    return res.render('admin/register')
  },

  dissconectAllUsers: (req, res) => {
    logger.warn('disconecting everyone')
    EditorRealTimeController.emitToAll(
      'forceDisconnect',
      'Sorry, we are performing a quick update to the editor and need to close it down. Please refresh the page to continue.'
    )
    return res.sendStatus(200)
  },

  closeEditor(req, res) {
    logger.warn('closing editor')
    Settings.editorIsOpen = req.body.isOpen
    return res.sendStatus(200)
  },

  writeAllToMongo(req, res) {
    logger.log('writing all docs to mongo')
    Settings.mongo.writeAll = true
    return DocumentUpdaterHandler.flushAllDocsToMongo(function() {
      logger.log('all docs have been saved to mongo')
      return res.sendStatus(200)
    })
  },

  flushProjectToTpds(req, res) {
    return TpdsProjectFlusher.flushProjectToTpds(req.body.project_id, err =>
      res.sendStatus(200)
    )
  },

  pollDropboxForUser(req, res) {
    const { user_id } = req.body
    return TpdsUpdateSender.pollDropboxForUser(user_id, () =>
      res.sendStatus(200)
    )
  },

  createMessage(req, res, next) {
    return SystemMessageManager.createMessage(req.body.content, function(
      error
    ) {
      if (error != null) {
        return next(error)
      }
      AsyncFormHelper.redirect(req, res, '/admin')
    })
  },

  clearMessages(req, res, next) {
    return SystemMessageManager.clearMessages(function(error) {
      if (error != null) {
        return next(error)
      }
      AsyncFormHelper.redirect(req, res, '/admin')
    })
  }
}

module.exports = AdminController
