/* eslint-disable
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
const { expect } = require('chai')
const async = require('async')
const express = require('express')
const path = require('path')
const translations = require('translations-sharelatex').setup()
const {
  db,
  ObjectId
} = require('../../../../../app/src/infrastructure/mongojs')
const User = require('../../../../../test/acceptance/src/helpers/User')
const ProjectGetter = require('../../../../../app/src/Features/Project/ProjectGetter')
const ProjectEntityHandler = require('../../../../../app/src/Features/Project/ProjectEntityHandler')

const MockProjectHistoryApi = require('../../../../../test/acceptance/src/helpers/MockProjectHistoryApi')
const MockDocUpdaterApi = require('../../../../../test/acceptance/src/helpers/MockDocUpdaterApi')
const MockFileStoreApi = require('../../../../../test/acceptance/src/helpers/MockFileStoreApi')
const MockDocstoreApi = require('../../../../../test/acceptance/src/helpers/MockDocstoreApi')
const MockV1Api = require('../../../../../test/acceptance/src/helpers/MockV1Api')

const PROJECT_URI_REGEX = /^\/project\/([0-9a-fA-F]{24})$/

describe('Open In Overleaf', function() {
  this.timeout(25000)

  before(function(done) {
    const LinkedUrlProxy = express()
    LinkedUrlProxy.get('/', (req, res, next) => {
      if (req.query.url === 'http://example.org/test.tex') {
        return res.send('One two three four\nI declare a thumb war')
      } else if (req.query.url === 'http://example.org/fancyname.tex') {
        return res.send(`\
\\documentclass[12pt]{article}
\\begin{document}
\\title{fancy name}
I have a fancy name
\\end{document}\
`)
      } else if (req.query.url === 'http://example.org/boringname.tex') {
        return res.send(`\
\\documentclass[12pt]{article}
\\begin{document}
\\title{boring name}
I have a boring name
\\end{document}\
`)
      } else if (req.query.url === 'http://example.org/badname.tex') {
        return res.send(`\
\\documentclass[12pt]{article}
\\begin{document}
\\title{bad \\\\ name}
I have a bad name
\\end{document}\
`)
      } else if (req.query.url === 'http://example.org/project.zip') {
        return res.sendFile(path.join(__dirname, '../fixtures', 'project.zip'))
      } else if (req.query.url === 'http://example.org/badname.zip') {
        return res.sendFile(path.join(__dirname, '../fixtures', 'badname.zip'))
      } else if (
        req.query.url ===
        'https://production-overleaf-static.s3.amazonaws.com/v1templates/peerj.zip'
      ) {
        return res.sendFile(path.join(__dirname, '../fixtures', 'peerj.zip'))
      } else if (
        req.query.url ===
        'https://production-overleaf-static.s3.amazonaws.com/v1templates/blank.zip'
      ) {
        return res.sendFile(path.join(__dirname, '../fixtures', 'blank.zip'))
      } else {
        return res.sendStatus(404)
      }
    })

    LinkedUrlProxy.listen(6543, done)

    MockV1Api.brands.OSF = {
      id: 176,
      name: 'Open Science Framework',
      partner: null,
      slug: 'OSF',
      default_variation_id: 1234
    }

    MockV1Api.brand_variations[1234] = { id: 1235 }
    MockV1Api.brand_variations[6789] = { id: 6789 }
    MockV1Api.brand_variations[69] = { id: 69 }

    MockV1Api.validation_clients.ieee_latexqc = {
      brand_variation_id: '1234',
      conversions: {
        conversion_foo: 'http://example.org/project.zip'
      }
    }
    return (MockV1Api.validation_clients.wombat_university = {
      brand_variation_id: null,
      conversions: {
        conversion_bar: 'http://example.org/project.zip'
      }
    })
  })

  beforeEach(function(done) {
    this.user = new User()
    return this.user.login(done)
  })

  it('should warm caches', function() {
    expect(true).to.equal(true)
  })

  return describe('when creating a project from a snippet', function() {
    describe('when POSTing a snippet with a valid csrf token via xhr', function() {
      beforeEach(function(done) {
        return this.user.request.post(
          {
            url: '/docs',
            form: {
              _csrf: this.user.csrfToken,
              snip: 'test'
            },
            headers: {
              'X-Requested-With': 'XMLHttpRequest'
            }
          },
          (_err, _res, _body) => {
            this.err = _err
            this.res = _res
            this.body = _body
            return done()
          }
        )
      })

      it('should not produce an error', function() {
        return expect(this.err).not.to.exist
      })

      it('should redirect to a project', function() {
        expect(this.res.statusCode).to.equal(200)
        expect(this.res.headers['content-type']).to.match(/^application\/json/)
        return expect(JSON.parse(this.body).redirect).to.match(
          PROJECT_URI_REGEX
        )
      })

      return it('should create a project with the returned id', function(done) {
        const projectId = JSON.parse(this.body).redirect.match(
          PROJECT_URI_REGEX
        )[1]
        expect(projectId).to.exist
        return ProjectGetter.getProject(projectId, (error, project) => {
          if (error != null) {
            return done(error)
          }

          expect(project).to.exist

          return done()
        })
      })
    })

    describe('when POSTing a snippet with a valid csrf token via a form', function() {
      beforeEach(function(done) {
        return this.user.request.post(
          {
            url: '/docs',
            form: {
              _csrf: this.user.csrfToken,
              snip: 'test'
            }
          },
          (_err, _res, _body) => {
            this.err = _err
            this.res = _res
            this.body = _body
            return done()
          }
        )
      })

      it('should not produce an error', function() {
        return expect(this.err).not.to.exist
      })

      it('should redirect to a project', function() {
        expect(this.res.statusCode).to.equal(302)
        return expect(this.res.headers.location).to.match(PROJECT_URI_REGEX)
      })

      return it('should create a project with the returned id', function(done) {
        const projectId = this.res.headers.location.match(PROJECT_URI_REGEX)[1]
        expect(projectId).to.exist
        return ProjectGetter.getProject(projectId, (error, project) => {
          if (error != null) {
            return done(error)
          }

          expect(project).to.exist

          return done()
        })
      })
    })

    describe('when POSTing a snippet which specifies a compiler', function() {
      beforeEach(function(done) {
        return this.user.request.post(
          {
            url: '/docs',
            form: {
              _csrf: this.user.csrfToken,
              snip: 'test',
              engine: 'latex_dvipdf'
            },
            headers: {
              'X-Requested-With': 'XMLHttpRequest'
            }
          },
          (_err, _res, _body) => {
            this.err = _err
            this.res = _res
            this.body = _body
            return done()
          }
        )
      })

      return it('should create a project with the requested compiler', function(done) {
        const projectId = JSON.parse(this.body).redirect.match(
          PROJECT_URI_REGEX
        )[1]
        expect(projectId).to.exist
        return ProjectGetter.getProject(projectId, (error, project) => {
          if (error != null) {
            return done(error)
          }

          expect(project).to.exist
          expect(project.compiler).to.equal('latex')

          return done()
        })
      })
    })

    describe('when POSTing a snippet which specifies a brand_variation_id', function() {
      beforeEach(function(done) {
        return this.user.request.post(
          {
            url: '/docs',
            form: {
              _csrf: this.user.csrfToken,
              snip: 'test',
              brand_variation_id: '6789'
            },
            headers: {
              'X-Requested-With': 'XMLHttpRequest'
            }
          },
          (_err, _res, _body) => {
            this.err = _err
            this.res = _res
            this.body = _body
            return done()
          }
        )
      })

      return it('should create a project with the requested brand variation', function(done) {
        const projectId = JSON.parse(this.body).redirect.match(
          PROJECT_URI_REGEX
        )[1]
        expect(projectId).to.exist
        return ProjectGetter.getProject(projectId, (error, project) => {
          if (error != null) {
            return done(error)
          }

          expect(project).to.exist
          expect(project.brandVariationId).to.equal('6789')

          return done()
        })
      })
    })

    describe('when GETing with a snippet in the query', function() {
      beforeEach(function(done) {
        return this.user.request.get('/docs?snip=test', (_err, _res, _body) => {
          this.err = _err
          this.res = _res
          this.body = _body
          return done()
        })
      })

      return it('should render the gateway page', function() {
        expect(this.err).not.to.exist
        expect(this.res.headers.location).not.to.exist
        return expect(this.res.statusCode).to.equal(200)
      })
    })

    describe('when GETing with a csrf token', function() {
      beforeEach(function(done) {
        return this.user.request.get(
          `/docs?snip=test?_csrf=${this.user.csrfToken}`,
          (_err, _res, _body) => {
            this.err = _err
            this.res = _res
            this.body = _body
            return done()
          }
        )
      })

      return it('should render the gateway page', function() {
        expect(this.err).not.to.exist
        expect(this.res.headers.location).not.to.exist
        return expect(this.res.statusCode).to.equal(200)
      })
    })

    describe('when POSTing a snippet without a csrf token', function() {
      beforeEach(function(done) {
        return this.user.request.post(
          {
            url: '/docs',
            form: {
              _csrf: 'badtoken',
              snip: 'test'
            }
          },
          (_err, _res, _body) => {
            this.err = _err
            this.res = _res
            this.body = _body
            return done()
          }
        )
      })

      it('should render to the gateway page', function() {
        expect(this.err).not.to.exist
        expect(this.res.headers.location).not.to.exist
        return expect(this.res.statusCode).to.equal(200)
      })

      return it('should allow rendering of the gateway page without redirecting', function(done) {
        return this.user.request.get('/docs', (err, res, body) => {
          expect(err).not.to.exist
          expect(res.headers.location).not.to.exist
          expect(res.statusCode).to.equal(200)
          return done()
        })
      })
    })

    describe('when POSTing a snippet for a non-logged-in user', function() {
      return it('should render the gateway page', function(done) {
        const guest = new User()
        return guest.request.post(
          {
            url: '/docs',
            form: {
              _csrf: guest.csrfToken,
              snip: 'test'
            }
          },
          (err, res, body) => {
            expect(err).not.to.exist
            expect(res.statusCode).to.equal(200)
            return done()
          }
        )
      })
    })

    describe('when POSTing without a snippet', function() {
      return it('should render an error page', function(done) {
        return this.user.request.post(
          {
            url: '/docs',
            form: {
              _csrf: this.user.csrfToken
            }
          },
          (err, res, body) => {
            expect(err).not.to.exist
            expect(res.statusCode).to.equal(400)
            return done()
          }
        )
      })
    })

    describe('when POSTing an encoded snippet with valid csrf', function() {
      beforeEach(function(done) {
        return this.user.request.post(
          {
            url: '/docs',
            form: {
              _csrf: this.user.csrfToken,
              encoded_snip: '%22wombat%5C%7B%5C%26%5C%7D%22'
            },
            headers: {
              'X-Requested-With': 'XMLHttpRequest'
            }
          },
          (_err, _res, _body) => {
            this.err = _err
            this.res = _res
            this.body = _body
            return done()
          }
        )
      })

      it('should not produce an error', function() {
        return expect(this.err).not.to.exist
      })

      it('should send a json response to redirect to a project', function() {
        expect(this.res.statusCode).to.equal(200)
        expect(this.res.headers['content-type']).to.match(/application\/json/)
        return expect(JSON.parse(this.body).redirect).to.match(
          PROJECT_URI_REGEX
        )
      })

      return it('should create a project containing the decoded snippet', function(done) {
        const projectId = JSON.parse(this.body).redirect.match(
          PROJECT_URI_REGEX
        )[1]
        expect(projectId).to.exist
        return ProjectGetter.getProject(projectId, (error, project) => {
          if (error != null) {
            return done(error)
          }

          expect(project).to.exist
          return ProjectEntityHandler.getDoc(
            project._id,
            project.rootDoc_id,
            (error, lines) => {
              if (error != null) {
                return done(error)
              }

              expect(lines).to.include('"wombat\\{\\&\\}"')

              return done()
            }
          )
        })
      })
    })

    describe('when POSTing a snip_uri with valid csrf', function() {
      beforeEach(function(done) {
        return this.user.request.post(
          {
            url: '/docs',
            form: {
              _csrf: this.user.csrfToken,
              snip_uri: 'http://example.org/test.tex'
            },
            headers: {
              'X-Requested-With': 'XMLHttpRequest'
            }
          },
          (_err, _res, _body) => {
            this.err = _err
            this.res = _res
            this.body = _body
            return done()
          }
        )
      })

      it('should not produce an error', function() {
        return expect(this.err).not.to.exist
      })

      it('should send a json response to redirect to a project', function() {
        expect(this.res.statusCode).to.equal(200)
        expect(this.res.headers['content-type']).to.match(/application\/json/)
        return expect(JSON.parse(this.body).redirect).to.match(
          PROJECT_URI_REGEX
        )
      })

      return it('should create a project containing the retrieved snippet', function(done) {
        const projectId = JSON.parse(this.body).redirect.match(
          PROJECT_URI_REGEX
        )[1]
        expect(projectId).to.exist
        return ProjectGetter.getProject(projectId, (error, project) => {
          if (error != null) {
            return done(error)
          }

          expect(project).to.exist
          return ProjectEntityHandler.getDoc(
            project._id,
            project.rootDoc_id,
            (error, lines) => {
              if (error != null) {
                return done(error)
              }

              expect(lines).to.include('One two three four')

              return done()
            }
          )
        })
      })
    })

    describe('when POSTing a snip_uri for a zip file', function() {
      beforeEach(function(done) {
        return this.user.request.post(
          {
            url: '/docs',
            form: {
              _csrf: this.user.csrfToken,
              snip_uri: 'http://example.org/project.zip'
            }
          },
          (_err, _res, _body) => {
            this.err = _err
            this.res = _res
            this.body = _body
            return done()
          }
        )
      })

      it('should not produce an error', function() {
        return expect(this.err).not.to.exist
      })

      it('should redirect to a project', function() {
        expect(this.res.statusCode).to.equal(302)
        return expect(this.res.headers.location).to.match(PROJECT_URI_REGEX)
      })

      return it('should create a project containing the retrieved snippet', function(done) {
        const projectId = this.res.headers.location.match(PROJECT_URI_REGEX)[1]
        expect(projectId).to.exist
        return ProjectGetter.getProject(projectId, (error, project) => {
          if (error != null) {
            return done(error)
          }

          expect(project).to.exist
          return ProjectEntityHandler.getDoc(
            project._id,
            project.rootDoc_id,
            (error, lines) => {
              if (error != null) {
                return done(error)
              }

              expect(lines).to.include('Wombat? Wombat.')

              return done()
            }
          )
        })
      })
    })

    describe('when POSTing a zip_uri for a zip file', function() {
      beforeEach(function(done) {
        return this.user.request.post(
          {
            url: '/docs',
            form: {
              _csrf: this.user.csrfToken,
              zip_uri: 'http://example.org/project.zip'
            }
          },
          (_err, _res, _body) => {
            this.err = _err
            this.res = _res
            this.body = _body
            return done()
          }
        )
      })

      it('should not produce an error', function() {
        return expect(this.err).not.to.exist
      })

      it('should redirect to a project', function() {
        expect(this.res.statusCode).to.equal(302)
        return expect(this.res.headers.location).to.match(PROJECT_URI_REGEX)
      })

      it('should create a project containing the retrieved snippet', function(done) {
        const projectId = this.res.headers.location.match(PROJECT_URI_REGEX)[1]
        expect(projectId).to.exist
        return ProjectGetter.getProject(projectId, (error, project) => {
          if (error != null) {
            return done(error)
          }

          expect(project).to.exist
          return ProjectEntityHandler.getDoc(
            project._id,
            project.rootDoc_id,
            (error, lines) => {
              if (error != null) {
                return done(error)
              }

              expect(lines).to.include('Wombat? Wombat.')

              return done()
            }
          )
        })
      })

      return it("should read the name from the zip's main.tex file", function(done) {
        const projectId = this.res.headers.location.match(PROJECT_URI_REGEX)[1]
        expect(projectId).to.exist
        return ProjectGetter.getProject(projectId, (error, project) => {
          if (error != null) {
            return done(error)
          }

          expect(project).to.exist
          expect(project.name).to.match(/^wombat/)
          return done()
        })
      })
    })

    describe('when POSTing a zip_uri that contains a publisher_slug', function() {
      beforeEach(function(done) {
        return this.user.request.post(
          {
            url: '/docs',
            form: {
              _csrf: this.user.csrfToken,
              zip_uri: 'http://example.org/project.zip',
              publisher_slug: 'OSF'
            }
          },
          (_err, _res, _body) => {
            this.err = _err
            this.res = _res
            this.body = _body
            return done()
          }
        )
      })

      it('should not produce an error', function() {
        return expect(this.err).not.to.exist
      })

      it('should redirect to a project', function() {
        expect(this.res.statusCode).to.equal(302)
        return expect(this.res.headers.location).to.match(PROJECT_URI_REGEX)
      })

      return it('should create a project with the correct brand variation id', function(done) {
        const projectId = this.res.headers.location.match(PROJECT_URI_REGEX)[1]
        expect(projectId).to.exist
        return ProjectGetter.getProject(projectId, (error, project) => {
          if (error != null) {
            return done(error)
          }

          expect(project).to.exist
          expect(project.brandVariationId).to.equal('1234')
          return done()
        })
      })
    })

    describe('when POSTing a zip_uri that contains a brand variation id', function() {
      beforeEach(function(done) {
        return this.user.request.post(
          {
            url: '/docs',
            form: {
              _csrf: this.user.csrfToken,
              zip_uri: 'http://example.org/project.zip',
              brand_variation_id: '6789'
            }
          },
          (_err, _res, _body) => {
            this.err = _err
            this.res = _res
            this.body = _body
            return done()
          }
        )
      })

      it('should not produce an error', function() {
        return expect(this.err).not.to.exist
      })

      it('should redirect to a project', function() {
        expect(this.res.statusCode).to.equal(302)
        return expect(this.res.headers.location).to.match(PROJECT_URI_REGEX)
      })

      return it('should create a project with the correct brand variation id', function(done) {
        const projectId = this.res.headers.location.match(PROJECT_URI_REGEX)[1]
        expect(projectId).to.exist
        return ProjectGetter.getProject(projectId, (error, project) => {
          if (error != null) {
            return done(error)
          }

          expect(project).to.exist
          expect(project.brandVariationId).to.equal('6789')
          return done()
        })
      })
    })

    describe('when POSTing a zip_uri that contains an invalid publisher_slug', function() {
      beforeEach(function(done) {
        return this.user.request.post(
          {
            url: '/docs',
            form: {
              _csrf: this.user.csrfToken,
              zip_uri: 'http://example.org/project.zip',
              publisher_slug: 'wombat'
            }
          },
          (_err, _res, _body) => {
            this.err = _err
            this.res = _res
            this.body = _body
            return done()
          }
        )
      })

      it('should not produce an error', function() {
        return expect(this.err).not.to.exist
      })

      return it("should return a 'not found' error", function() {
        return expect(this.res.statusCode).to.equal(404)
      })
    })

    describe('when POSTing a snip_uri for a zip file with an invalid name in the tex contents', function() {
      beforeEach(function(done) {
        return this.user.request.post(
          {
            url: '/docs',
            form: {
              _csrf: this.user.csrfToken,
              snip_uri: 'http://example.org/badname.zip'
            }
          },
          (_err, _res, _body) => {
            this.err = _err
            this.res = _res
            this.body = _body
            return done()
          }
        )
      })

      return it('should not create a project with an invalid name', function(done) {
        const projectId = this.res.headers.location.match(PROJECT_URI_REGEX)[1]
        expect(projectId).to.exist
        return ProjectGetter.getProject(projectId, (error, project) => {
          if (error != null) {
            return done(error)
          }

          expect(project).to.exist
          expect(project.name).to.match(/^bad[^\\]+name/)
          return done()
        })
      })
    })

    describe('when POSTing a snip_uri that does not exist', function() {
      beforeEach(function(done) {
        return this.user.request.post(
          {
            url: '/docs',
            form: {
              _csrf: this.user.csrfToken,
              snip_uri: 'http://example.org/test.texx'
            },
            headers: {
              'X-Requested-With': 'XMLHttpRequest'
            }
          },
          (_err, _res, _body) => {
            this.err = _err
            this.res = _res
            this.body = _body
            return done()
          }
        )
      })

      return it("should return a 'not found' error", function() {
        expect(this.res.statusCode).to.equal(404)
        return expect(JSON.parse(this.body).error).to.equal(
          translations.i18n.translate('not_found_error_from_the_supplied_url')
        )
      })
    })

    describe('when POSTing a template name', function() {
      beforeEach(function(done) {
        return this.user.request.post(
          {
            url: '/docs',
            form: {
              _csrf: this.user.csrfToken,
              template: 'blank'
            }
          },
          (_err, _res, _body) => {
            this.err = _err
            this.res = _res
            this.body = _body
            return done()
          }
        )
      })

      it('should not produce an error', function() {
        return expect(this.err).not.to.exist
      })

      return it('should redirect to a project', function() {
        expect(this.res.statusCode).to.equal(302)
        return expect(this.res.headers.location).to.match(PROJECT_URI_REGEX)
      })
    })

    describe('when POSTing a template name that links to a template with a brand variation', function() {
      beforeEach(function(done) {
        return this.user.request.post(
          {
            url: '/docs',
            form: {
              _csrf: this.user.csrfToken,
              template: 'peerj'
            }
          },
          (_err, _res, _body) => {
            this.err = _err
            this.res = _res
            this.body = _body
            return done()
          }
        )
      })

      it('should not produce an error', function() {
        return expect(this.err).not.to.exist
      })

      it('should redirect to a project', function() {
        expect(this.res.statusCode).to.equal(302)
        return expect(this.res.headers.location).to.match(PROJECT_URI_REGEX)
      })

      return it('should not create a project with an invalid name', function(done) {
        const projectId = this.res.headers.location.match(PROJECT_URI_REGEX)[1]
        expect(projectId).to.exist
        return ProjectGetter.getProject(projectId, (error, project) => {
          if (error != null) {
            return done(error)
          }

          expect(project).to.exist
          expect(project.brandVariationId).to.equal('69')
          return done()
        })
      })
    })

    describe('when POSTing a template name that does not exist', function() {
      beforeEach(function(done) {
        return this.user.request.post(
          {
            url: '/docs',
            form: {
              _csrf: this.user.csrfToken,
              template: 'wombat'
            },
            headers: {
              'X-Requested-With': 'XMLHttpRequest'
            }
          },
          (_err, _res, _body) => {
            this.err = _err
            this.res = _res
            this.body = _body
            return done()
          }
        )
      })

      return it("should return a 'not found' error", function() {
        expect(this.res.statusCode).to.equal(404)
        return expect(JSON.parse(this.body).error).to.equal(
          'the_requested_template_was_not_found'
        )
      })
    })

    describe('when sending more than one kind of snippet parameter', function() {
      beforeEach(function(done) {
        return this.user.request.post(
          {
            url: '/docs',
            form: {
              _csrf: this.user.csrfToken,
              template: 'wombat',
              snip_uri: 'http://banana.net/pineapple.tex'
            },
            headers: {
              'X-Requested-With': 'XMLHttpRequest'
            }
          },
          (_err, _res, _body) => {
            this.err = _err
            this.res = _res
            this.body = _body
            return done()
          }
        )
      })

      return it("should return an 'ambiguous parameters' error", function() {
        expect(this.res.statusCode).to.equal(400)
        return expect(JSON.parse(this.body).error).to.equal(
          translations.i18n.translate(
            'more_than_one_kind_of_snippet_was_requested'
          )
        )
      })
    })

    describe('when POSTing a partner and client_media_id', function() {
      beforeEach(function(done) {
        return this.user.request.post(
          {
            url: '/docs',
            form: {
              _csrf: this.user.csrfToken,
              partner: 'ieee_latexqc',
              client_media_id: 'conversion_foo'
            }
          },
          (_err, _res, _body) => {
            this.err = _err
            this.res = _res
            this.body = _body
            return done()
          }
        )
      })

      it('should not produce an error', function() {
        return expect(this.err).not.to.exist
      })

      it('should redirect to a project', function() {
        expect(this.res.statusCode).to.equal(302)
        return expect(this.res.headers.location).to.match(PROJECT_URI_REGEX)
      })

      return it("should use the partner's brand variation", function(done) {
        const projectId = this.res.headers.location.match(PROJECT_URI_REGEX)[1]
        expect(projectId).to.exist
        return ProjectGetter.getProject(projectId, (error, project) => {
          if (error != null) {
            return done(error)
          }

          expect(project).to.exist
          expect(project.brandVariationId).to.equal('1234')
          return done()
        })
      })
    })

    describe('when POSTing a partner and client_media_id that does not exist', function() {
      beforeEach(function(done) {
        return this.user.request.post(
          {
            url: '/docs',
            form: {
              _csrf: this.user.csrfToken,
              partner: 'potato',
              client_media_id: 'conversion_foo'
            }
          },
          (_err, _res, _body) => {
            this.err = _err
            this.res = _res
            this.body = _body
            return done()
          }
        )
      })

      it('should not produce an error', function() {
        return expect(this.err).not.to.exist
      })

      return it('should redirect to a project', function() {
        expect(this.res.statusCode).to.equal(404)
        return expect(this.res.headers.location).not.to.exist
      })
    })

    describe('when POSTing a partner and client_media_id that has no brand variation', function() {
      beforeEach(function(done) {
        return this.user.request.post(
          {
            url: '/docs',
            form: {
              _csrf: this.user.csrfToken,
              partner: 'wombat_university',
              client_media_id: 'conversion_bar'
            }
          },
          (_err, _res, _body) => {
            this.err = _err
            this.res = _res
            this.body = _body
            return done()
          }
        )
      })

      it('should not produce an error', function() {
        return expect(this.err).not.to.exist
      })

      it('should redirect to a project', function() {
        expect(this.res.statusCode).to.equal(302)
        return expect(this.res.headers.location).to.match(PROJECT_URI_REGEX)
      })

      return it('should have a null brand variation', function(done) {
        const projectId = this.res.headers.location.match(PROJECT_URI_REGEX)[1]
        expect(projectId).to.exist
        return ProjectGetter.getProject(projectId, (error, project) => {
          if (error != null) {
            return done(error)
          }

          expect(project).to.exist
          expect(project.brandVariationId).not.to.exist
          return done()
        })
      })
    })

    describe('when the document has a title', function() {
      beforeEach(function(done) {
        return this.user.request.post(
          {
            url: '/docs',
            form: {
              _csrf: this.user.csrfToken,
              snip_uri: 'http://example.org/fancyname.tex'
            },
            headers: {
              'X-Requested-With': 'XMLHttpRequest'
            }
          },
          (_err, _res, _body) => {
            this.err = _err
            this.res = _res
            this.body = _body
            return done()
          }
        )
      })

      it('should create a project with the correct name', function(done) {
        const projectId = JSON.parse(this.body).redirect.match(
          PROJECT_URI_REGEX
        )[1]
        expect(projectId).to.exist
        return ProjectGetter.getProject(projectId, (error, project) => {
          if (error != null) {
            return done(error)
          }

          expect(project.name).to.equal('fancy name')
          return done()
        })
      })

      return it('should ensure that the project name is unique', function(done) {
        const projectId = JSON.parse(this.body).redirect.match(
          PROJECT_URI_REGEX
        )[1]
        expect(projectId).to.exist
        return this.user.request.post(
          {
            url: '/docs',
            form: {
              _csrf: this.user.csrfToken,
              snip_uri: 'http://example.org/fancyname.tex'
            },
            headers: {
              'X-Requested-With': 'XMLHttpRequest'
            }
          },
          (err, res, body) => {
            expect(err).not.to.exist
            const newProjectId = JSON.parse(body).redirect.match(
              PROJECT_URI_REGEX
            )[1]
            expect(newProjectId).to.exist

            return ProjectGetter.getProject(newProjectId, (error, project) => {
              if (error != null) {
                return done(error)
              }

              expect(project.name).to.match(/fancy name.+/)
              return done()
            })
          }
        )
      })
    })

    describe('when snip_name is supplied', function() {
      beforeEach(function(done) {
        return this.user.request.post(
          {
            url: '/docs',
            form: {
              _csrf: this.user.csrfToken,
              snip_uri: 'http://example.org/fancyname.tex',
              snip_name: 'penguin'
            },
            headers: {
              'X-Requested-With': 'XMLHttpRequest'
            }
          },
          (_err, _res, _body) => {
            this.err = _err
            this.res = _res
            this.body = _body
            return done()
          }
        )
      })

      it('should create a project with the correct name', function(done) {
        const projectId = JSON.parse(this.body).redirect.match(
          PROJECT_URI_REGEX
        )[1]
        expect(projectId).to.exist
        return ProjectGetter.getProject(projectId, (error, project) => {
          if (error != null) {
            return done(error)
          }

          expect(project.name).to.equal('penguin')
          return done()
        })
      })

      return it('should ensure that the project name is unique', function(done) {
        const projectId = JSON.parse(this.body).redirect.match(
          PROJECT_URI_REGEX
        )[1]
        expect(projectId).to.exist
        return this.user.request.post(
          {
            url: '/docs',
            form: {
              _csrf: this.user.csrfToken,
              snip_uri: 'http://example.org/fancyname.tex',
              snip_name: 'penguin'
            },
            headers: {
              'X-Requested-With': 'XMLHttpRequest'
            }
          },
          (err, res, body) => {
            expect(err).not.to.exist
            const newProjectId = JSON.parse(body).redirect.match(
              PROJECT_URI_REGEX
            )[1]
            expect(newProjectId).to.exist

            return ProjectGetter.getProject(newProjectId, (error, project) => {
              if (error != null) {
                return done(error)
              }

              expect(project.name).to.match(/penguin.+/)
              return done()
            })
          }
        )
      })
    })

    return describe('when opening an array of files', function() {
      describe('with a basic .tex and a .zip', function() {
        beforeEach(function(done) {
          return this.user.request.post(
            {
              url: '/docs',
              form: {
                _csrf: this.user.csrfToken,
                snip_uri: [
                  'http://example.org/test.tex',
                  'http://example.org/project.zip'
                ]
              },
              headers: {
                'X-Requested-With': 'XMLHttpRequest'
              }
            },
            (_err, _res, _body) => {
              this.err = _err
              this.res = _res
              this.body = _body
              return done()
            }
          )
        })

        it('should create a project with the default project name', function(done) {
          const projectId = JSON.parse(this.body).redirect.match(
            PROJECT_URI_REGEX
          )[1]
          expect(projectId).to.exist

          return ProjectGetter.getProject(projectId, (error, project) => {
            if (error != null) {
              return done(error)
            }

            expect(project.name).to.equal(
              translations.i18n.translate('new_snippet_project')
            )
            return done()
          })
        })

        it('should add the .tex file as a document', function(done) {
          const projectId = JSON.parse(this.body).redirect.match(
            PROJECT_URI_REGEX
          )[1]
          expect(projectId).to.exist

          return ProjectGetter.getProject(projectId, (error, project) => {
            if (error != null) {
              return done(error)
            }

            expect(project.rootFolder[0].docs.length).to.equal(1)
            expect(project.rootFolder[0].docs[0].name).to.equal('test.tex')
            return done()
          })
        })

        return it('should add the .zip file as a file', function(done) {
          const projectId = JSON.parse(this.body).redirect.match(
            PROJECT_URI_REGEX
          )[1]
          expect(projectId).to.exist

          return ProjectGetter.getProject(projectId, (error, project) => {
            if (error != null) {
              return done(error)
            }

            expect(project.rootFolder[0].fileRefs.length).to.equal(1)
            expect(project.rootFolder[0].fileRefs[0].name).to.equal(
              'project.zip'
            )
            return done()
          })
        })
      })

      describe('when names are supplied for the files', function() {
        beforeEach(function(done) {
          return this.user.request.post(
            {
              url: '/docs',
              form: {
                _csrf: this.user.csrfToken,
                snip_uri: [
                  'http://example.org/test.tex',
                  'http://example.org/project.zip'
                ],
                snip_name: ['wombat.tex', 'potato.zip']
              },
              headers: {
                'X-Requested-With': 'XMLHttpRequest'
              }
            },
            (_err, _res, _body) => {
              this.err = _err
              this.res = _res
              this.body = _body
              return done()
            }
          )
        })

        return it('should use the supplied filenames', function(done) {
          const projectId = JSON.parse(this.body).redirect.match(
            PROJECT_URI_REGEX
          )[1]
          expect(projectId).to.exist

          return ProjectGetter.getProject(projectId, (error, project) => {
            if (error != null) {
              return done(error)
            }

            expect(project.rootFolder[0].docs.length).to.equal(1)
            expect(project.rootFolder[0].docs[0].name).to.equal('wombat.tex')
            expect(project.rootFolder[0].fileRefs.length).to.equal(1)
            expect(project.rootFolder[0].fileRefs[0].name).to.equal(
              'potato.zip'
            )
            return done()
          })
        })
      })

      describe('when the brand variation is supplied', function() {
        beforeEach(function(done) {
          return this.user.request.post(
            {
              url: '/docs',
              form: {
                _csrf: this.user.csrfToken,
                snip_uri: [
                  'http://example.org/test.tex',
                  'http://example.org/project.zip'
                ],
                brand_variation_id: '6789'
              },
              headers: {
                'X-Requested-With': 'XMLHttpRequest'
              }
            },
            (_err, _res, _body) => {
              this.err = _err
              this.res = _res
              this.body = _body
              return done()
            }
          )
        })

        return it('should use the supplied brand variation id', function(done) {
          const projectId = JSON.parse(this.body).redirect.match(
            PROJECT_URI_REGEX
          )[1]
          expect(projectId).to.exist

          return ProjectGetter.getProject(projectId, (error, project) => {
            if (error != null) {
              return done(error)
            }

            expect(project.brandVariationId).to.equal('6789')
            return done()
          })
        })
      })

      return describe('when the brand variation is supplied but does not exist', function() {
        beforeEach(function(done) {
          return this.user.request.post(
            {
              url: '/docs',
              form: {
                _csrf: this.user.csrfToken,
                snip_uri: [
                  'http://example.org/test.tex',
                  'http://example.org/project.zip'
                ],
                brand_variation_id: 'wombat'
              },
              headers: {
                'X-Requested-With': 'XMLHttpRequest'
              }
            },
            (_err, _res, _body) => {
              this.err = _err
              this.res = _res
              this.body = _body
              return done()
            }
          )
        })

        return it("should generate a 'not found' error", function() {
          return expect(this.res.statusCode).to.equal(404)
        })
      })
    })
  })
})
