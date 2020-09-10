const { Agent } = require('http')
const { createConnection } = require('net')
const { promisify } = require('util')
const OError = require('@overleaf/o-error')
const requestModule = require('request')
const Settings = require('@overleaf/settings')
const LoginRateLimiter = require('../../../app/src/Features/Security/LoginRateLimiter')
const RateLimiter = require('../../../app/src/infrastructure/RateLimiter')

class SmokeTestFailure extends OError {
  constructor(message, stats) {
    const info = { stats, failureMessage: message }
    super(message, info)
  }
}
const Failure = SmokeTestFailure

// send requests to web router if this is the api process
const OWN_PORT = Settings.port || Settings.internal.web.port || 3000
const PORT = (Settings.web && Settings.web.web_router_port) || OWN_PORT
const STEP_TIMEOUT = Settings.smokeTest.stepTimeout

// like the curl option `--resolve DOMAIN:PORT:127.0.0.1`
class LocalhostAgent extends Agent {
  createConnection(options, callback) {
    return createConnection(PORT, '127.0.0.1', callback)
  }
}

// degrade the 'HttpOnly; Secure;' flags of the cookie
class InsecureCookieJar extends requestModule.jar().constructor {
  setCookie(...args) {
    const cookie = super.setCookie(...args)
    cookie.secure = false
    cookie.httpOnly = false
    return cookie
  }
}

const CSRF_REGEX = /<meta id="ol-csrfToken" content="(.+?)">/
function _parseCsrf(body) {
  if (typeof body !== 'string') {
    throw new Error('Body is not of type string.')
  }
  const match = CSRF_REGEX.exec(body)
  if (!match) {
    throw new Error('No meta element for csrfToken found.')
  }
  return match[1]
}

module.exports = runSmokeTest
module.exports.Failure = Failure
async function runSmokeTest(stats) {
  let step
  let lastStep = stats.start
  const steps = []
  stats.steps = steps

  const request = promisify(
    requestModule.defaults({
      agent: new LocalhostAgent(),
      baseUrl: `http://smoke${Settings.cookieDomain}/`,
      headers: {
        'X-Forwarded-Proto': 'https'
      },
      jar: new InsecureCookieJar(),
      timeout: STEP_TIMEOUT
    })
  )

  step = Date.now()
  steps.push({ init: step - lastStep })
  lastStep = step

  async function cleanupRateLimits() {
    let timeoutCleanupRateLimits
    await Promise.race([
      new Promise((resolve, reject) => {
        timeoutCleanupRateLimits = setTimeout(
          reject,
          STEP_TIMEOUT,
          new Failure('cleanupRateLimits timed out', stats)
        )
      }),
      Promise.all([
        LoginRateLimiter.promises
          .recordSuccessfulLogin(Settings.smokeTest.user)
          .catch(err => {
            throw new Failure(
              'error clearing login failure rate limit',
              stats
            ).withCause(err)
          }),
        RateLimiter.promises
          .clearRateLimit(
            'open-project',
            `${Settings.smokeTest.projectId}:${Settings.smokeTest.userId}`
          )
          .catch(err => {
            throw new Failure(
              'error clearing open-project rate limit',
              stats
            ).withCause(err)
          })
      ]).finally(() => clearTimeout(timeoutCleanupRateLimits))
    ]).finally(() => {
      step = Date.now()
      steps.push({ cleanupRateLimits: step - lastStep })
      lastStep = step
    })
  }

  async function getCsrfTokenFor(endpoint) {
    return request({ url: endpoint })
      .then(response => {
        if (response.statusCode !== 200) {
          throw new Error(`unexpected response code: ${response.statusCode}`)
        }
        return _parseCsrf(response.body)
      })
      .finally(() => {
        step = Date.now()
        const logEntry = {}
        logEntry['getCsrfTokenFor/' + endpoint] = step - lastStep
        steps.push(logEntry)
        lastStep = step
      })
      .catch(err => {
        throw new Failure('error fetching csrf token', stats).withCause(err)
      })
  }

  async function cleanup() {
    const logoutCsrfToken = await getCsrfTokenFor('logout')
    return request({
      method: 'POST',
      url: 'logout',
      json: {
        _csrf: logoutCsrfToken
      }
    })
  }

  const loginCsrfToken = await getCsrfTokenFor('login')
  await cleanupRateLimits()
  await request({
    method: 'POST',
    url: 'login',
    json: {
      _csrf: loginCsrfToken,
      email: Settings.smokeTest.user,
      password: Settings.smokeTest.password
    }
  })
    .then(response => {
      const body = response.body
      // login success and login failure both receive a status code of 200
      // see the frontend logic on how to handle the response:
      //   frontend/js/directives/asyncForm.js -> submitRequest
      if (body && body.message && body.message.type === 'error') {
        throw new Error(body.message.text)
      }
      if (response.statusCode !== 200) {
        throw new Error(`unexpected response code: ${response.statusCode}`)
      }
    })
    .finally(() => {
      step = Date.now()
      steps.push({ login: step - lastStep })
      lastStep = step
    })
    .catch(err => {
      throw new Failure('login failed', stats).withCause(err)
    })

  await request({ uri: `project/${Settings.smokeTest.projectId}` })
    .then(response => {
      if (response.statusCode !== 200) {
        throw new Error(`unexpected response code: ${response.statusCode}`)
      }

      const body = response.body
      if (typeof body !== 'string') {
        throw new Error('body is not of type string')
      }

      if (
        !body.includes(
          `<meta id="ol-project_id" content="${Settings.smokeTest.projectId}">`
        )
      ) {
        throw new Error('project page html does not have project_id')
      }
    })
    .finally(() => {
      step = Date.now()
      steps.push({ loadEditor: step - lastStep })
      lastStep = step
    })
    .catch(err => {
      cleanup().catch(() => {})
      throw new Failure('loading editor failed', stats).withCause(err)
    })

  await request({ uri: 'project' })
    .then(response => {
      if (response.statusCode !== 200) {
        throw new Error(`unexpected response code: ${response.statusCode}`)
      }

      const body = response.body
      if (typeof body !== 'string') {
        throw new Error('body is not of type string')
      }

      if (
        !/<title>Your Projects - .*, Online LaTeX Editor<\/title>/.test(body)
      ) {
        throw new Error('body does not have correct title')
      }

      if (!body.includes('ProjectPageController')) {
        throw new Error('body does not have correct angular controller')
      }
    })
    .finally(() => {
      step = Date.now()
      steps.push({ loadProjectDashboard: step - lastStep })
      lastStep = step
    })
    .catch(err => {
      cleanup().catch(() => {})
      throw new Failure('loading project list failed', stats).withCause(err)
    })

  await cleanup()
    .finally(() => {
      step = Date.now()
      steps.push({ logout: step - lastStep })
    })
    .catch(err => {
      throw new Failure('logout failed', stats).withCause(err)
    })
  return stats
}
