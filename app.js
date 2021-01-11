/* eslint-disable
    max-len,
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
metrics.initialize(process.env.METRICS_APP_NAME || 'web')
const Settings = require('@overleaf/settings')
const logger = require('logger-sharelatex')
logger.initialize(process.env.METRICS_APP_NAME || 'web')
logger.logger.serializers.user = require('./app/src/infrastructure/LoggerSerializers').user
logger.logger.serializers.docs = require('./app/src/infrastructure/LoggerSerializers').docs
logger.logger.serializers.files = require('./app/src/infrastructure/LoggerSerializers').files
logger.logger.serializers.project = require('./app/src/infrastructure/LoggerSerializers').project

metrics.memory.monitor(logger)
const { promisify } = require('util')
const OError = require('@overleaf/o-error')
const { getNativeDb } = require('./app/src/infrastructure/Mongoose')
const Server = require('./app/src/infrastructure/Server')
const mongodb = require('./app/src/infrastructure/mongodb')
const Queues = require('./app/src/infrastructure/Queues')

Queues.initialize()

const port = Settings.port || Settings.internal.web.port || 3000
const host = Settings.internal.web.host || 'localhost'
if (!module.parent) {
  // Called directly

  if (Settings.overleaf != null) {
    // We want to make sure that we provided a password through the environment.
    if (!process.env.WEB_API_USER || !process.env.WEB_API_PASSWORD) {
      throw new Error('No API user and password provided')
    }
  }
  Promise.all([getNativeDb(), mongodb.waitForDb()])
    .catch(err => {
      throw new OError('cannot connect to mongo').withCause(err)
    })
    .then(() =>
      promisify(cb => Server.server.listen(port, host, cb))().catch(err => {
        throw new OError('cannot start http server').withCause(err)
      })
    )
    .then(() => {
      logger.info(`web starting up, listening on ${host}:${port}`)
      logger.info(`${require('http').globalAgent.maxSockets} sockets enabled`)
      // wait until the process is ready before monitoring the event loop
      metrics.event_loop.monitor(logger)
    })
    .catch(err => {
      logger.fatal({ err }, 'startup failed exiting')
      process.exit(1)
    })
}

// handle SIGTERM for graceful shutdown in kubernetes
process.on('SIGTERM', function(signal) {
  logger.warn({ signal: signal }, 'received signal, shutting down')
  Settings.shuttingDown = true
})

module.exports = Server.server
