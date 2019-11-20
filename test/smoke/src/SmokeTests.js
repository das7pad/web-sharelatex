const chai = require('chai')
const { expect } = chai
const Settings = require('settings-sharelatex')
let ownPort = Settings.internal.web.port || Settings.port || 3000
const port = Settings.web.web_router_port || ownPort // send requests to web router if this is the api process
const logger = require('logger-sharelatex')
const LoginRateLimiter = require('../../../app/src/Features/Security/LoginRateLimiter')
const RateLimiter = require('../../../app/src/infrastructure/RateLimiter')

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
  before(function(done) {
    logger.log('smoke test: setup')
    LoginRateLimiter.recordSuccessfulLogin(Settings.smokeTest.user, err => {
      if (err != null) {
        logger.err({ err }, 'smoke test: error recoring successful login')
        return done(err)
      }
      return RateLimiter.clearRateLimit(
        'open-project',
        `${Settings.smokeTest.projectId}:${Settings.smokeTest.userId}`,
        err => {
          if (err != null) {
            logger.err(
              { err },
              'smoke test: error clearing open-project rate limit'
            )
            return done(err)
          }
          return RateLimiter.clearRateLimit(
            'overleaf-login',
            Settings.smokeTest.rateLimitSubject,
            err => {
              if (err != null) {
                logger.err(
                  { err },
                  'smoke test: error clearing overleaf-login rate limit'
                )
                return done(err)
              }
              return done()
            }
          )
        }
      )
    })
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
      expect(error, 'smoke test: error in getting project').to.not.exist

      expect(response.statusCode).to.equal(
        200,
        'smoke test: response code is not 200 getting project'
      )

      // Check that the project id is present in the javascript that loads up the project
      expect(body).to.include(
        `window.project_id = "${Settings.smokeTest.projectId}"`,
        'smoke test: project page html does not have project_id'
      )
      done()
    })
  })

  it('the project list', function(done) {
    logger.log('smoke test: Checking can load project list')
    this.timeout(4000)
    request.get('project', {}, (error, response, body) => {
      expect(error, 'smoke test: error returned in getting project list').to.not
        .exist
      expect(response.statusCode).to.equal(
        200,
        'smoke test: response code is not 200 getting project list'
      )
      expect(body).to.match(
        /<title>Your Projects - .*, Online LaTeX Editor<\/title>/,
        'smoke test: body does not have correct title'
      )
      expect(body).to.include(
        'ProjectPageController',
        'smoke test: body does not have correct angular controller'
      )
      done()
    })
  })
})
