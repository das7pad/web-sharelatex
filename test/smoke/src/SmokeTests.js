const async = require('async')
const Settings = require('settings-sharelatex')
let ownPort = Settings.internal.web.port || Settings.port || 3000
const port = Settings.web.web_router_port || ownPort // send requests to web router if this is the api process
const logger = require('logger-sharelatex')
const OError = require('@overleaf/o-error')
const LoginRateLimiter = require('../../../app/src/Features/Security/LoginRateLimiter')
const RateLimiter = require('../../../app/src/infrastructure/RateLimiter')

class SmokeTestFailure extends OError {
  constructor(message, info = {}) {
    // include the message in JSON serialized strings (log and http response)
    info.message = message
    super({ message, info })
  }
}
const Failure = SmokeTestFailure

const agent = require('http').Agent()
// like the curl option `--resolve DOMAIN:PORT:127.0.0.1`
agent.createConnection = function alwaysConnectToLocalhost(options, callback) {
  return require('net').createConnection(port, '127.0.0.1', callback)
}

const jar = require('request').jar()
const actualJarSetCookie = jar.setCookie
jar.setCookie = function degradeCookieSecurity() {
  const cookie = actualJarSetCookie.apply(this, arguments)
  cookie.secure = false
  cookie.httpOnly = false
  return cookie
}

const request = require('request').defaults({
  baseUrl: `http://smoke${Settings.cookieDomain}/`,
  jar: jar,
  agent: agent,
  headers: {
    'X-Forwarded-Proto': 'https'
  },
  qs: {
    setLng: 'en'
  }
})

describe('Opening', function() {
  before(function(outerDone) {
    logger.log('smoke test: setup')
    async.parallel(
      {
        clearLoginFailureRateLimit(done) {
          LoginRateLimiter.recordSuccessfulLogin(
            Settings.smokeTest.user,
            err => {
              if (err != null) {
                logger.err(
                  { err },
                  'smoke test: error recording successful login'
                )
                return done(
                  new Failure('error clearing login failure rate limit')
                )
              }
              done()
            }
          )
        },
        clearOpenProjectRateLimit(done) {
          RateLimiter.clearRateLimit(
            'open-project',
            `${Settings.smokeTest.projectId}:${Settings.smokeTest.userId}`,
            err => {
              if (err != null) {
                logger.err(
                  { err },
                  'smoke test: error clearing open-project rate limit'
                )
                return done(
                  new Failure('error clearing open-project rate limit')
                )
              }
              done()
            }
          )
        },
        clearOverleafLoginRateLimit(done) {
          RateLimiter.clearRateLimit(
            'overleaf-login',
            Settings.smokeTest.rateLimitSubject,
            err => {
              if (err != null) {
                logger.err(
                  { err },
                  'smoke test: error clearing overleaf-login rate limit'
                )
                return done(
                  new Failure('error clearing overleaf login rate limit')
                )
              }
              done()
            }
          )
        }
      },
      outerDone
    )
  })

  before(function(done) {
    logger.log('smoke test: hitting dev/csrf')
    request.get('dev/csrf', {}, (err, response, body) => {
      if (err != null) {
        return done(err)
      }
      logger.log('smoke test: hitting /login with csrf')
      const json = {
        _csrf: body,
        email: Settings.smokeTest.user,
        password: Settings.smokeTest.password
      }
      request.post('login', { json }, (err, response, body) => {
        if (err != null) {
          return done(err)
        }
        // login success and login failure both receive a status code of 200
        // see the frontend logic on how to handle the response:
        //   frontend/js/directives/asyncForm.js -> submitRequest
        if (body && body.message && body.message.type === 'error') {
          const text = body.message.text
          logger.err({ text }, 'smoke test: login failed')
          return done(new Error(`Login failed: ${text}`))
        }
        logger.log('smoke test: finishing setup')
        done()
      })
    })
  })

  after(function(done) {
    logger.log('smoke test: cleaning up')
    request.get('dev/csrf', {}, (err, response, body) => {
      if (err != null) {
        return done(err)
      }
      const json = { _csrf: body }
      request.post('logout', { json }, done)
    })
  })

  it('a project', function(done) {
    logger.log('smoke test: Checking can load a project')
    this.timeout(4000)
    const uri = `project/${Settings.smokeTest.projectId}`
    request.get(uri, {}, (error, response, body) => {
      if (error != null) {
        return done(new Failure('error in getting project').withCause(error))
      }

      if (response.statusCode !== 200) {
        return done(
          new Failure('response code is not 200 getting project', {
            statusCode: response.statusCode
          })
        )
      }

      if (typeof body !== 'string') {
        return done(
          new Failure('body is not of type string', { bodyType: typeof body })
        )
      }

      // Check that the project id is present in the javascript that loads up the project
      if (
        body.indexOf(
          `window.project_id = "${Settings.smokeTest.projectId}"`
        ) === -1
      ) {
        return done(new Failure('project page html does not have project_id'))
      }
      done()
    })
  })

  it('the project list', function(done) {
    logger.log('smoke test: Checking can load project list')
    this.timeout(4000)
    request.get('project', {}, (error, response, body) => {
      if (error != null) {
        return done(
          new Failure('error returned in getting project list').withCause(error)
        )
      }

      if (response.statusCode !== 200) {
        return done(
          new Failure('response code is not 200 getting project list', {
            statusCode: response.statusCode
          })
        )
      }

      if (typeof body !== 'string') {
        return done(
          new Failure('body is not of type string', { bodyType: typeof body })
        )
      }

      if (
        !/<title>Your Projects - .*, Online LaTeX Editor<\/title>/.test(body)
      ) {
        return done(new Failure('body does not have correct title'))
      }

      if (body.indexOf('ProjectPageController') === -1) {
        return done(
          new Failure('body does not have correct angular controller')
        )
      }
      done()
    })
  })
})
