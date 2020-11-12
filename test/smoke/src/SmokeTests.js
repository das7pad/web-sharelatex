const OError = require('@overleaf/o-error')
const Settings = require('@overleaf/settings')
const RateLimiter = require('../../../app/src/infrastructure/RateLimiter')
const getRequest = require('./request')

class SmokeTestFailure extends OError {
  constructor(message, stats, cause) {
    super(message, { stats }, cause)
  }
}
const Failure = SmokeTestFailure

const STEP_TIMEOUT = Settings.smokeTest.stepTimeout
const ANGULAR_PROJECT_CONTROLLER_REGEX = /controller="ProjectPageController"/
const CSRF_REGEX = /<meta id="ol-csrfToken" content="(.+?)">/
const PROJECT_ID_REGEX = new RegExp(
  `<meta id="ol-project_id" content="${Settings.smokeTest.projectId}">`
)
const TITLE_REGEX = /<title>Your Projects - .*, Online LaTeX Editor<\/title>/
function _parseCsrf(body) {
  const match = CSRF_REGEX.exec(body)
  if (!match) {
    throw new Error('Cannot find csrfToken in HTML.')
  }
  return match[1]
}

async function clearRateLimit(endpointName, subject) {
  try {
    await RateLimiter.promises.clearRateLimit(endpointName, subject)
  } catch (err) {
    throw new OError(
      'error clearing rate limit',
      { endpointName, subject },
      err
    )
  }
}
async function clearLoginRateLimit() {
  await clearRateLimit('login', Settings.smokeTest.user)
}
async function clearOpenProjectRateLimit() {
  await clearRateLimit(
    'open-project',
    `${Settings.smokeTest.projectId}:${Settings.smokeTest.userId}`
  )
}
async function cleanupRateLimits() {
  let timeoutCleanupRateLimits
  await Promise.race([
    new Promise((resolve, reject) => {
      timeoutCleanupRateLimits = setTimeout(() => {
        reject(new OError('cleanupRateLimits timed out'))
      }, STEP_TIMEOUT)
    }),
    Promise.all([
      clearLoginRateLimit(),
      clearOpenProjectRateLimit()
    ]).finally(() => clearTimeout(timeoutCleanupRateLimits))
  ])
}
function assertHasStatusCode(response, expected) {
  const { statusCode: actual } = response
  if (actual !== expected) {
    throw new OError('unexpected response code', { actual, expected })
  }
}

module.exports = runSmokeTest
module.exports.Failure = Failure
async function runSmokeTest(stats) {
  let step
  let lastStep = stats.start
  function completeStep(key) {
    step = Date.now()
    stats.steps.push({ [key]: step - lastStep })
    lastStep = step
  }

  const request = getRequest(STEP_TIMEOUT)

  completeStep('init')

  async function getCsrfTokenFor(endpoint) {
    try {
      const response = await request(endpoint)
      assertHasStatusCode(response, 200)
      return _parseCsrf(response.body)
    } catch (err) {
      throw new Failure(`error fetching csrf token on ${endpoint}`, stats, err)
    } finally {
      completeStep('getCsrfTokenFor' + endpoint)
    }
  }

  async function cleanup() {
    const logoutCsrfToken = await getCsrfTokenFor('/logout')
    const response = await request('/logout', {
      method: 'POST',
      headers: {
        'X-CSRF-Token': logoutCsrfToken
      }
    })
    assertHasStatusCode(response, 302)
  }

  const loginCsrfToken = await getCsrfTokenFor('/login')
  try {
    await cleanupRateLimits()
  } catch (err) {
    throw new Failure('error clearing rate limits', stats, err)
  } finally {
    completeStep('cleanupRateLimits')
  }

  try {
    const response = await request('/login', {
      method: 'POST',
      json: {
        _csrf: loginCsrfToken,
        email: Settings.smokeTest.user,
        password: Settings.smokeTest.password
      }
    })
    const body = response.body
    // login success and login failure both receive a status code of 200
    // see the frontend logic on how to handle the response:
    //   frontend/js/directives/asyncForm.js -> submitRequest
    if (body && body.message && body.message.type === 'error') {
      throw new Error(body.message.text)
    }
    assertHasStatusCode(response, 200)
  } catch (err) {
    throw new Failure('login failed', stats, err)
  } finally {
    completeStep('login')
  }

  try {
    const response = await request(`/project/${Settings.smokeTest.projectId}`)
    assertHasStatusCode(response, 200)
    if (!PROJECT_ID_REGEX.test(response.body)) {
      throw new Error('project page html does not have project_id')
    }
  } catch (err) {
    cleanup().catch(() => {})
    throw new Failure('loading editor failed', stats, err)
  } finally {
    completeStep('loadEditor')
  }

  try {
    const response = await request('/project')
    assertHasStatusCode(response, 200)
    if (!TITLE_REGEX.test(response.body)) {
      throw new Error('body does not have correct title')
    }
    if (!ANGULAR_PROJECT_CONTROLLER_REGEX.test(response.body)) {
      throw new Error('body does not have correct angular controller')
    }
  } catch (err) {
    cleanup().catch(() => {})
    throw new Failure('loading project list failed', stats, err)
  } finally {
    completeStep('loadProjectDashboard')
  }

  try {
    await cleanup()
  } catch (err) {
    throw new Failure('logout failed', stats, err)
  } finally {
    completeStep('logout')
  }
}
