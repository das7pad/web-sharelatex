const RedisWrapper = require('../../infrastructure/RedisWrapper')
const rclient = RedisWrapper.client('health_check')
const settings = require('@overleaf/settings')
const logger = require('logger-sharelatex')
const UserGetter = require('../User/UserGetter')
const {
  SmokeTestFailure,
  runSmokeTests,
} = require('./../../../../test/smoke/src/SmokeTests')

let lastApiCheck = {
  expires: 0,
  pending: Promise.resolve(false),
}

async function cachedApiCheck() {
  const now = Date.now()
  if (lastApiCheck.expires < now) {
    lastApiCheck = {
      expires: now + settings.performApiCheckEvery,
      pending: doApiCheck(),
    }
  }
  return lastApiCheck.pending
}

async function doApiCheck() {
  try {
    await rclient.healthCheck()
  } catch (err) {
    logger.err({ err }, 'failed api redis health check')
    return false
  }
  try {
    const email = await UserGetter.promises.getUserEmail(
      settings.smokeTest.userId
    )
    if (!email) {
      logger.err({}, 'failed api mongo health check (no email)')
      return false
    }
  } catch (err) {
    logger.err({ err }, 'failed api mongo health check')
    return false
  }
  return true
}

module.exports = {
  check(req, res, next) {
    if (!settings.siteIsOpen || !settings.editorIsOpen) {
      // always return successful health checks when site is closed
      res.contentType('application/json')
      res.sendStatus(200)
    } else {
      // detach from express for cleaner stack traces
      setTimeout(() => runSmokeTestsDetached(req, res).catch(next))
    }
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
    const ok = cachedApiCheck()
    if (ok) {
      res.sendStatus(200)
    } else {
      res.sendStatus(500)
    }
  },

  checkRedis(req, res, next) {
    return rclient.healthCheck(function (error) {
      if (error != null) {
        logger.err({ err: error }, 'failed redis health check')
        return res.sendStatus(500)
      } else {
        return res.sendStatus(200)
      }
    })
  },

  checkMongo(req, res, next) {
    return UserGetter.getUserEmail(
      settings.smokeTest.userId,
      function (err, email) {
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
      }
    )
  },
}

function prettyJSON(blob) {
  return JSON.stringify(blob, null, 2) + '\n'
}
async function runSmokeTestsDetached(req, res) {
  function isAborted() {
    return req.aborted
  }
  const stats = { start: new Date(), steps: [] }
  let status, response
  try {
    try {
      await runSmokeTests({ isAborted, stats })
    } finally {
      stats.end = new Date()
      stats.duration = stats.end - stats.start
    }
    status = 200
    response = { stats }
  } catch (e) {
    let err = e
    if (!(e instanceof SmokeTestFailure)) {
      err = new SmokeTestFailure('low level error', {}, e)
    }
    logger.err({ err, stats }, 'health check failed')
    status = 500
    response = { stats, error: err.message }
  }
  if (isAborted()) return
  res.contentType('application/json')
  res.status(status).send(prettyJSON(response))
}
