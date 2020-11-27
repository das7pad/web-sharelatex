const RedisWrapper = require('../../infrastructure/RedisWrapper')
const rclient = RedisWrapper.client('health_check')
const settings = require('@overleaf/settings')
const logger = require('logger-sharelatex')
const UserGetter = require('../User/UserGetter')

module.exports = {
  check(req, res) {
    // detach from express stack
    setTimeout(runSmokeTest, 0, res)
  },

  checkActiveHandles(req, res, next) {
    if (!(settings.maxActiveHandles > 0) || !process._getActiveHandles) {
      return next()
    }
    const activeHandlesCount = (process._getActiveHandles() || []).length
    if (activeHandlesCount > settings.maxActiveHandles) {
      logger.err(
        { activeHandlesCount, maxActiveHandles: settings.maxActiveHandles },
        'exceeded max active handles, failing health check'
      )
      return res.sendStatus(500)
    } else {
      logger.debug(
        { activeHandlesCount, maxActiveHandles: settings.maxActiveHandles },
        'active handles are below maximum'
      )
      next()
    }
  },

  checkApi(req, res, next) {
    rclient.healthCheck(err => {
      if (err) {
        logger.err({ err }, 'failed api redis health check')
        return res.sendStatus(500)
      }
      UserGetter.getUserEmail(settings.smokeTest.userId, (err, email) => {
        if (err) {
          logger.err({ err }, 'failed api mongo health check')
          return res.sendStatus(500)
        }
        if (email == null) {
          logger.err({ err }, 'failed api mongo health check (no email)')
          return res.sendStatus(500)
        }
        res.sendStatus(200)
      })
    })
  },

  checkRedis(req, res, next) {
    return rclient.healthCheck(function(error) {
      if (error != null) {
        logger.err({ err: error }, 'failed redis health check')
        return res.sendStatus(500)
      } else {
        return res.sendStatus(200)
      }
    })
  },

  checkMongo(req, res, next) {
    return UserGetter.getUserEmail(settings.smokeTest.userId, function(
      err,
      email
    ) {
      if (err != null) {
        logger.err({ err }, 'mongo health check failed, error present')
        return res.sendStatus(500)
      } else if (email == null) {
        logger.err(
          { err },
          'mongo health check failed, no emai present in find result'
        )
        return res.sendStatus(500)
      } else {
        return res.sendStatus(200)
      }
    })
  }
}

const smokeTests = require('./../../../../test/smoke/src/SmokeTests')
function prettyJSON(blob) {
  return JSON.stringify(blob, null, 2) + '\n'
}
function runSmokeTest(res) {
  res.contentType('application/json')
  const stats = { start: new Date() }
  smokeTests(stats)
    .finally(() => {
      stats.end = new Date()
      stats.duration = stats.end - stats.start
    })
    .then(stats => {
      res.status(200).send(prettyJSON({ stats }))
    })
    .catch(err => {
      if (!(err instanceof smokeTests.Failure)) {
        err = new smokeTests.Failure('low level error', stats).withCause(err)
      }
      const { failureMessage } = err.info
      delete err.info.failureMessage
      logger.err({ err }, 'health check failed')
      res.status(500).send(prettyJSON({ stats, error: failureMessage }))
    })
}
