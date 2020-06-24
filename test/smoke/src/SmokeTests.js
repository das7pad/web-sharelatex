const Settings = require('settings-sharelatex')
const ownPort = Settings.internal.web.port || Settings.port || 3000
const port = Settings.web.web_router_port || ownPort // send requests to web router if this is the api process
const OError = require('@overleaf/o-error')
const LoginRateLimiter = require('../../../app/src/Features/Security/LoginRateLimiter')
const RateLimiter = require('../../../app/src/infrastructure/RateLimiter')
const requestModule = require('request')
const { promisify } = require('util')

class SmokeTestFailure extends OError {
  constructor(message, stats) {
    const info = { stats, failureMessage: message }
    super({ message, info })
  }
}
const Failure = SmokeTestFailure

const agent = require('http').Agent()
// like the curl option `--resolve DOMAIN:PORT:127.0.0.1`
agent.createConnection = function alwaysConnectToLocalhost(options, callback) {
  return require('net').createConnection(port, '127.0.0.1', callback)
}

module.exports = runSmokeTest
module.exports.Failure = Failure
async function runSmokeTest(stats) {
  let step
  let lastStep = stats.start
  const steps = []
  stats.steps = steps

  const jar = require('request').jar()
  const actualJarSetCookie = jar.setCookie
  jar.setCookie = function degradeCookieSecurity() {
    const cookie = actualJarSetCookie.apply(this, arguments)
    cookie.secure = false
    cookie.httpOnly = false
    return cookie
  }

  const request = promisify(
    requestModule.defaults({
      baseUrl: `http://smoke${Settings.cookieDomain}/`,
      jar: jar,
      agent: agent,
      headers: {
        'X-Forwarded-Proto': 'https'
      },
      qs: {
        setLng: 'en'
      },
      timeout: 4000
    })
  )

  step = Date.now()
  steps.push({ init: step - lastStep })
  lastStep = step

  // TODO(das7pad): timeouts for redis calls
  await Promise.all([
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
      }),
    RateLimiter.promises
      .clearRateLimit('overleaf-login', Settings.smokeTest.rateLimitSubject)
      .catch(err => {
        throw new Failure(
          'error clearing overleaf-login rate limit',
          stats
        ).withCause(err)
      })
  ]).finally(() => {
    step = Date.now()
    steps.push({ cleanupRateLimits: step - lastStep })
    lastStep = step
  })

  const _csrf = await request({ url: 'dev/csrf' })
    .then(async response => {
      if (response.statusCode !== 200) {
        throw new Error(`unexpected response code: ${response.statusCode}`)
      }
      return response.body
    })
    .finally(() => {
      step = Date.now()
      steps.push({ getCsrfToken: step - lastStep })
      lastStep = step
    })
    .catch(err => {
      throw new Failure('error fetching csrf token', stats).withCause(err)
    })

  async function cleanup() {
    return request({ method: 'POST', url: 'logout', json: { _csrf } })
  }

  await request({
    method: 'POST',
    url: 'login',
    json: {
      _csrf,
      email: Settings.smokeTest.user,
      password: Settings.smokeTest.password
    }
  })
    .then(async response => {
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
    .then(async response => {
      if (response.statusCode !== 200) {
        throw new Error(`unexpected response code: ${response.statusCode}`)
      }

      const body = response.body
      if (typeof body !== 'string') {
        throw new Error('body is not of type string')
      }

      // Check that the project id is present in the javascript that loads up the project
      if (
        body.indexOf(
          `<meta id="ol-project_id" content="${Settings.smokeTest.projectId}">`
        ) === -1
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
    .then(async response => {
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

      if (body.indexOf('ProjectPageController') === -1) {
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
