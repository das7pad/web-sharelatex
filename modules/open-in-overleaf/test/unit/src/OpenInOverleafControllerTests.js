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
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const { assert } = require('chai')
const sinon = require('sinon')
const chai = require('chai')
const _ = require('underscore')
const should = chai.should()
const { expect } = chai
const modulePath = '../../../app/src/OpenInOverleafController.js'
const SandboxedModule = require('sandboxed-module')
const { ObjectId } = require('mongojs')
const Errors = require('../../../../../app/src/Features/Errors/Errors')
const OpenInOverleafErrors = require('../../../app/src/OpenInOverleafErrors')

describe('OpenInOverleafController', function() {
  beforeEach(function() {
    this.project_id = '123213jlkj9kdlsaj'
    this.user = {
      _id: '588f3ddae8ebc1bac07c9fa4',
      first_name: 'bjkdsjfk',
      features: {}
    }
    this.snip = 'snippety snip\nsnap snap'
    this.comment = '% comment\n'
    this.documentLines = ['% comment', 'snippety snip', 'snap snap']
    this.snippet = {
      comment: this.comment,
      snip: this.snip,
      defaultTitle: 'default_title'
    }
    this.snip_uri = 'http://snip.io/foo.tex'
    this.tmpfile = '/tmp/foo.tex'
    this.req = {
      session: {
        user: this.user
      },
      body: {},
      header: sinon
        .stub()
        .withArgs('Referer')
        .returns('https://example.org/1/2/3'),
      headers: {
        accept: ['json']
      },
      i18n: {
        translate: sinon.stub().returnsArg(0)
      }
    }
    this.res = {
      json: sinon.stub(),
      redirect: sinon.stub()
    }
    this.project = { _id: this.project_id }
    this.ProjectCreationHandler = {
      createProjectFromSnippet: sinon
        .stub()
        .callsArgWith(3, null, this.project),
      createBlankProject: sinon.stub().callsArgWith(2, null, this.project)
    }
    this.ProjectDetailsHandler = {
      generateUniqueName: sinon
        .stub()
        .callsArgWith(2, null, 'new_snippet_project'),
      fixProjectName: sinon.stub().returnsArg(0)
    }
    this.ProjectUploadManager = {
      createProjectFromZipArchive: sinon
        .stub()
        .callsArgWith(3, null, this.project)
    }

    this.OpenInOverleafHelper = {
      getDocumentLinesFromSnippet: sinon
        .stub()
        .returns((this.comment + this.snip).split('\n')),
      setCompilerForProject: sinon.stub().callsArg(2),
      populateSnippetFromUri: sinon.stub().callsArgWith(2, null, this.snippet),
      populateSnippetFromUriArray: sinon.stub().callsArgWith(
        2,
        null,
        _.extend(
          {
            files: [
              { ctype: 'text/x-tex', content: this.snip },
              { ctype: 'application/zip', fspath: '/foo/bar.zip' }
            ]
          },
          this.snippet,
          { snip: undefined }
        )
      ),
      populateProjectFromFileList: sinon.stub().callsArg(2),
      setProjectBrandVariationFromSlug: sinon.stub().callsArg(2),
      snippetFileComment: sinon.stub().returns('% default_snippet_comment\n'),
      setProjectBrandVariationFromId: sinon.stub().callsArg(2)
    }
    this.OpenInOverleafHelper.snippetFileComment
      .withArgs('texample')
      .returns('% texample_snippet_comment\n')
    this.Csrf = { validateRequest: sinon.stub().callsArgWith(1, true) }
    this.AuthenticationController = {
      getLoggedInUserId: sinon.stub().returns(this.user._id)
    }

    return (this.OpenInOverleafController = SandboxedModule.require(
      modulePath,
      {
        requires: {
          'logger-sharelatex': {
            log() {},
            err() {}
          },
          '../../../../app/src/Features/Authentication/AuthenticationController': this
            .AuthenticationController,
          '../../../../app/src/Features/Project/ProjectCreationHandler': this
            .ProjectCreationHandler,
          '../../../../app/src/Features/Project/ProjectDetailsHandler': this
            .ProjectDetailsHandler,
          '../../../../app/src/Features/Uploads/ProjectUploadManager': this
            .ProjectUploadManager,
          './OpenInOverleafHelper': this.OpenInOverleafHelper
        }
      }
    ))
  })

  describe('openInOverleaf', function() {
    describe('when there is a raw snippet', function() {
      beforeEach(function() {
        return (this.req.body.snip = this.snip)
      })

      it('should process the snippet, create a project and redirect to it', function(done) {
        this.res.json = content => {
          sinon.assert.calledWith(
            this.OpenInOverleafHelper.getDocumentLinesFromSnippet,
            sinon.match.has('snip', this.snip)
          )
          sinon.assert.calledWith(
            this.ProjectCreationHandler.createProjectFromSnippet,
            this.user._id,
            'new_snippet_project',
            this.documentLines
          )
          assert.deepEqual(content, {
            redirect: '/project/' + this.project_id,
            projectId: this.project_id
          })
          return done()
        }
        return this.OpenInOverleafController.openInOverleaf(this.req, this.res)
      })

      it('should update the project with the requested engine, if supplied', function(done) {
        this.req.body.engine = 'latex_dvipdf'
        this.res.json = () => {
          sinon.assert.calledWith(
            this.OpenInOverleafHelper.setCompilerForProject,
            sinon.match.any,
            'latex_dvipdf'
          )
          return done()
        }
        return this.OpenInOverleafController.openInOverleaf(this.req, this.res)
      })

      it('should update the project with the requested brand variation id, if supplied', function(done) {
        this.req.body.brand_variation_id = 'wombat'
        this.res.json = () => {
          sinon.assert.calledWith(
            this.OpenInOverleafHelper.setProjectBrandVariationFromId,
            sinon.match.any,
            'wombat'
          )
          return done()
        }
        return this.OpenInOverleafController.openInOverleaf(this.req, this.res)
      })

      it('should use the default title if the document has no title', function(done) {
        this.res.json = () => {
          sinon.assert.calledWith(
            this.ProjectDetailsHandler.generateUniqueName,
            this.user._id,
            'new_snippet_project'
          )
          sinon.assert.called(this.ProjectDetailsHandler.fixProjectName)
          return done()
        }
        return this.OpenInOverleafController.openInOverleaf(this.req, this.res)
      })

      it('should use the document title from the snippet, if present', function(done) {
        this.snip = '\\title{wombat}'
        this.req.body.snip = this.snip
        this.OpenInOverleafHelper.getDocumentLinesFromSnippet = sinon
          .stub()
          .returns((this.comment + this.snip).split('\n'))
        this.res.json = () => {
          sinon.assert.calledWith(
            this.ProjectDetailsHandler.generateUniqueName,
            this.user._id,
            'wombat'
          )
          return done()
        }
        return this.OpenInOverleafController.openInOverleaf(this.req, this.res)
      })

      return it('should create a project with the snip name, if supplied', function(done) {
        this.req.body.snip_name = 'potato'
        this.OpenInOverleafHelper.getDocumentLinesFromSnippet = sinon
          .stub()
          .returns((this.comment + this.snip).split('\n'))
        this.res.json = () => {
          sinon.assert.calledWith(
            this.ProjectDetailsHandler.generateUniqueName,
            this.user._id,
            'potato'
          )
          return done()
        }
        return this.OpenInOverleafController.openInOverleaf(this.req, this.res)
      })
    })

    describe('when there is no snippet', function() {
      return it('should send a missing parameters error', function(done) {
        this.OpenInOverleafController._populateSnippetFromRequest = sinon.stub()
        delete this.req.body.snip
        return this.OpenInOverleafController.openInOverleaf(
          this.req,
          this.res,
          error => {
            expect(error.name).to.equal('MissingParametersError')
            sinon.assert.notCalled(
              this.OpenInOverleafController._populateSnippetFromRequest
            )
            return done()
          }
        )
      })
    })

    describe('when there is an encoded snippet', function() {
      beforeEach(function() {
        return (this.req.body.encoded_snip = encodeURIComponent(this.snip))
      })

      return it('should create a project and send a redirect to it', function(done) {
        this.res.json = content => {
          assert.deepEqual(content, {
            redirect: '/project/' + this.project_id,
            projectId: this.project_id
          })
          return done()
        }
        return this.OpenInOverleafController.openInOverleaf(this.req, this.res)
      })
    })

    describe('when there is a snippet uri', function() {
      beforeEach(function() {
        return (this.req.body.snip_uri = this.snip_uri)
      })

      return it('should create a project and redirect to it', function(done) {
        this.res.json = content => {
          assert.deepEqual(content, {
            redirect: '/project/' + this.project_id,
            projectId: this.project_id
          })
          return done()
        }
        return this.OpenInOverleafController.openInOverleaf(this.req, this.res)
      })
    })

    describe('when there is a snippet uri passed as zip_uri', function() {
      beforeEach(function() {
        return (this.req.body.zip_uri = this.snip_uri)
      })

      return it('should create a project and redirect to it', function(done) {
        this.res.json = content => {
          assert.deepEqual(content, {
            redirect: '/project/' + this.project_id,
            projectId: this.project_id
          })
          return done()
        }
        return this.OpenInOverleafController.openInOverleaf(this.req, this.res)
      })
    })

    describe('when there is an array of uris', function() {
      beforeEach(function() {
        return (this.req.body.snip_uri = [
          this.snip_uri,
          'http://foo.net/foo.tex'
        ])
      })

      it('should create a project and redirect to it', function(done) {
        this.res.json = content => {
          assert.deepEqual(content, {
            redirect: '/project/' + this.project_id,
            projectId: this.project_id
          })
          return done()
        }
        return this.OpenInOverleafController.openInOverleaf(this.req, this.res)
      })

      return it('should cate a blank project and populate it with a list of files', function(done) {
        this.res.json = () => {
          sinon.assert.called(this.ProjectDetailsHandler.generateUniqueName)
          sinon.assert.called(this.ProjectDetailsHandler.fixProjectName)
          sinon.assert.called(this.ProjectCreationHandler.createBlankProject)
          sinon.assert.called(
            this.OpenInOverleafHelper.populateProjectFromFileList
          )
          return done()
        }
        return this.OpenInOverleafController.openInOverleaf(this.req, this.res)
      })
    })

    describe('when the snippet uri is a zip file', function() {
      beforeEach(function() {
        this.req.body.snip_uri = 'http://foo.net/foo.zip'
        return (this.OpenInOverleafHelper.populateSnippetFromUri = sinon
          .stub()
          .callsArgWith(2, null, {
            projectFile: '/foo/bar.zip',
            defaultTitle: 'new_snippet_project'
          }))
      })

      it('should create a project from the zip file and redirect to it', function(done) {
        this.res.json = content => {
          sinon.assert.calledWith(
            this.ProjectUploadManager.createProjectFromZipArchive,
            this.user._id,
            'foo',
            '/foo/bar.zip'
          )
          assert.deepEqual(content, {
            redirect: '/project/' + this.project_id,
            projectId: this.project_id
          })
          return done()
        }
        return this.OpenInOverleafController.openInOverleaf(this.req, this.res)
      })

      return it('should use the snip_name if supplied', function(done) {
        this.OpenInOverleafHelper.populateSnippetFromUri = sinon
          .stub()
          .callsArgWith(2, null, {
            projectFile: '/foo/bar.zip',
            defaultTitle: 'new_snippet_project',
            snip_name: 'potato'
          })
        this.res.json = content => {
          sinon.assert.calledWith(
            this.ProjectUploadManager.createProjectFromZipArchive,
            this.user._id,
            'potato',
            '/foo/bar.zip'
          )
          assert.deepEqual(content, {
            redirect: '/project/' + this.project_id,
            projectId: this.project_id
          })
          return done()
        }
        return this.OpenInOverleafController.openInOverleaf(this.req, this.res)
      })
    })

    describe('when there is a publisher slug', function() {
      beforeEach(function() {
        this.req.body.snip_uri = `${this.snip_uri}.zip`
        return (this.OpenInOverleafController._populateSnippetFromRequest = sinon
          .stub()
          .callsArgWith(1, null, {
            projectFile: '/foo/bar.zip',
            defaultTitle: 'new_snippet_project',
            publisherSlug: 'OSF'
          }))
      })

      return it('should set the brand variation on the project', function(done) {
        this.res.json = content => {
          sinon.assert.calledWith(
            this.OpenInOverleafHelper.setProjectBrandVariationFromSlug,
            sinon.match.any,
            'OSF'
          )
          return done()
        }
        return this.OpenInOverleafController.openInOverleaf(this.req, this.res)
      })
    })

    describe('when there is a partner and client_media_id', function() {
      describe('when the partner and client_media_id exist', function() {
        beforeEach(function() {
          this.req.body.partner = 'ieee_latexqc'
          this.req.body.client_media_id = 'wombat1'
          return (this.OpenInOverleafHelper.populateSnippetFromConversionJob = sinon
            .stub()
            .callsArgWith(3, null, {
              projectFile: '/foo/bar.zip',
              defaultTitle: 'new_snippet_project',
              brandVariationId: '1234'
            }))
        })

        it('should populate the snippet from the conversion job', function(done) {
          this.res.json = content => {
            sinon.assert.calledWith(
              this.OpenInOverleafHelper.populateSnippetFromConversionJob,
              'ieee_latexqc',
              'wombat1'
            )
            return done()
          }
          return this.OpenInOverleafController.openInOverleaf(
            this.req,
            this.res
          )
        })

        it('should set the brand variation on the project', function(done) {
          this.res.json = content => {
            sinon.assert.calledWith(
              this.OpenInOverleafHelper.setProjectBrandVariationFromId,
              sinon.match.any,
              '1234'
            )
            return done()
          }
          return this.OpenInOverleafController.openInOverleaf(
            this.req,
            this.res
          )
        })

        return it('should create a project from the zip file and redirect to it', function(done) {
          this.res.json = content => {
            sinon.assert.calledWith(
              this.ProjectUploadManager.createProjectFromZipArchive,
              this.user._id,
              'new_snippet_project',
              '/foo/bar.zip'
            )
            assert.deepEqual(content, {
              redirect: '/project/' + this.project_id,
              projectId: this.project_id
            })
            return done()
          }
          return this.OpenInOverleafController.openInOverleaf(
            this.req,
            this.res
          )
        })
      })

      return describe('when the partner does not have a brand variation', function() {
        beforeEach(function() {
          this.req.body.partner = 'ieee_latexqc'
          this.req.body.client_media_id = 'wombat1'
          return (this.OpenInOverleafHelper.populateSnippetFromConversionJob = sinon
            .stub()
            .callsArgWith(3, null, {
              projectFile: '/foo/bar.zip',
              defaultTitle: 'new_snippet_project'
            }))
        })

        it('should create a project from the zip file and redirect to it', function(done) {
          this.res.json = content => {
            sinon.assert.calledWith(
              this.ProjectUploadManager.createProjectFromZipArchive,
              this.user._id,
              'new_snippet_project',
              '/foo/bar.zip'
            )
            assert.deepEqual(content, {
              redirect: '/project/' + this.project_id,
              projectId: this.project_id
            })
            return done()
          }
          return this.OpenInOverleafController.openInOverleaf(
            this.req,
            this.res
          )
        })

        return it('should not the brand variation on the project', function(done) {
          this.res.json = content => {
            sinon.assert.notCalled(
              this.OpenInOverleafHelper.setProjectBrandVariationFromId
            )
            return done()
          }
          return this.OpenInOverleafController.openInOverleaf(
            this.req,
            this.res
          )
        })
      })
    })

    describe('when there is a template parameter', function() {
      beforeEach(function() {
        this.req.body.template = 'wombat'
        return (this.OpenInOverleafHelper.populateSnippetFromTemplate = sinon
          .stub()
          .callsArgWith(2, null, {
            projectFile: '/foo/bar.zip',
            defaultTitle: 'new_snippet_project'
          }))
      })

      it('should not raise an error', function(done) {
        const next = sinon.stub()
        this.res.json = () => {
          sinon.assert.notCalled(next)
          return done()
        }
        return this.OpenInOverleafController.openInOverleaf(
          this.req,
          this.res,
          next
        )
      })

      it('should populate the snippet from the template', function(done) {
        this.res.json = () => {
          sinon.assert.calledWith(
            this.OpenInOverleafHelper.populateSnippetFromTemplate,
            'wombat'
          )
          return done()
        }
        return this.OpenInOverleafController.openInOverleaf(this.req, this.res)
      })

      it('should create a project from the associated zip', function(done) {
        this.res.json = () => {
          sinon.assert.called(
            this.ProjectUploadManager.createProjectFromZipArchive
          )
          return done()
        }
        return this.OpenInOverleafController.openInOverleaf(this.req, this.res)
      })

      return describe('when the template has a brand variation', function() {
        beforeEach(function() {
          return (this.OpenInOverleafHelper.populateSnippetFromTemplate = sinon
            .stub()
            .callsArgWith(2, null, {
              projectFile: '/foo/bar.zip',
              defaultTitle: 'new_snippet_project',
              brandVariationId: 1234
            }))
        })

        return it('should set the brand variation id on the project', function(done) {
          this.res.json = () => {
            sinon.assert.calledWith(
              this.OpenInOverleafHelper.setProjectBrandVariationFromId,
              sinon.match.any,
              1234
            )
            return done()
          }
          return this.OpenInOverleafController.openInOverleaf(
            this.req,
            this.res
          )
        })
      })
    })

    describe('when populating the snippet returns an error', function() {
      beforeEach(function() {
        this.req.body.snip_uri = this.snip_uri
        this.next = sinon.stub()
        this.error = new Error('Something bad happened')
        return (this.OpenInOverleafController._populateSnippetFromRequest = sinon
          .stub()
          .callsArgWith(1, this.error, null))
      })

      return it('should call the callback with an error', function() {
        this.OpenInOverleafController.openInOverleaf(
          this.req,
          this.res,
          this.next
        )
        sinon.assert.calledWith(this.next, this.error)
        return sinon.assert.notCalled(
          this.OpenInOverleafHelper.getDocumentLinesFromSnippet
        )
      })
    })

    return describe('when there are multiple types of snippet requested', function() {
      return it("should return an 'ambiguous parameters' error", function() {
        this.req.body.snip_uri = this.snip_uri
        this.req.body.snip = 'foo'
        const next = sinon.stub()
        this.OpenInOverleafController.openInOverleaf(this.req, this.res, next)
        return sinon.assert.calledWith(
          next,
          new OpenInOverleafErrors.AmbiguousParametersError()
        )
      })
    })
  })

  describe('_populateSnippetFromRequest', function() {
    beforeEach(function() {
      return (this.OpenInOverleafController._getMainFileCommentFromSnipRequest = sinon
        .stub()
        .returns(this.comment))
    })

    it('should return a snippet object with a comment, snippet and default title', function(done) {
      this.OpenInOverleafController._getSnippetContentsFromRequest = sinon
        .stub()
        .callsArgWith(1, null, { snip: this.snip })
      return this.OpenInOverleafController._populateSnippetFromRequest(
        this.req,
        (error, snippet) => {
          expect(error).not.to.exist
          snippet.snip.should.equal(this.snip)
          snippet.comment.should.equal(this.comment)
          snippet.defaultTitle.should.equal('new_snippet_project')
          return done()
        }
      )
    })

    it('should add the engine to the snippet, if present', function(done) {
      this.req.body.engine = 'latex_dvipdf'
      this.OpenInOverleafController._getSnippetContentsFromRequest = sinon
        .stub()
        .callsArgWith(1, null, { snip: this.snip })
      return this.OpenInOverleafController._populateSnippetFromRequest(
        this.req,
        (error, snippet) => {
          expect(error).not.to.exist
          expect(snippet.engine).to.exist
          snippet.engine.should.equal('latex_dvipdf')
          return done()
        }
      )
    })

    it('should return an error if retrieving the snippet returns an error', function(done) {
      this.OpenInOverleafController._getSnippetContentsFromRequest = sinon
        .stub()
        .callsArgWith(1, new Error())
      return this.OpenInOverleafController._populateSnippetFromRequest(
        this.req,
        (error, snippet) => {
          expect(error).to.exist
          return done()
        }
      )
    })

    return it('should return an error if there is no error, but no snippet', function(done) {
      this.OpenInOverleafController._getSnippetContentsFromRequest = sinon
        .stub()
        .callsArgWith(1, null, {})
      return this.OpenInOverleafController._populateSnippetFromRequest(
        this.req,
        (error, snippet) => {
          expect(error).to.exist
          return done()
        }
      )
    })
  })

  describe('_getMainFileCommentFromSnipRequest', function() {
    it('should return the default comment by default', function() {
      return this.OpenInOverleafController._getMainFileCommentFromSnipRequest(
        this.req
      ).should.equal('% default_snippet_comment\n')
    })

    it('should return an empty string if no comment is requested', function() {
      this.req.body.comment = 'none'
      return this.OpenInOverleafController._getMainFileCommentFromSnipRequest(
        this.req
      ).should.equal('')
    })

    return it('should return the texample comment if the referrer is texample', function() {
      this.req.body.referrer = 'https://asdf.texample.net/1/2/3'
      return this.OpenInOverleafController._getMainFileCommentFromSnipRequest(
        this.req
      ).should.equal('% texample_snippet_comment\n')
    })
  })

  return describe('_sendResponse', function() {
    it('should send a json response for xhr requests', function() {
      const project = { _id: this.project_id }
      this.OpenInOverleafController._sendResponse(this.req, this.res, project)
      sinon.assert.calledWith(this.res.json, {
        redirect: `/project/${this.project_id}`,
        projectId: this.project_id
      })
      return sinon.assert.notCalled(this.res.redirect)
    })

    return it('should send a redirect for standard requests', function() {
      const project = { _id: this.project_id }
      delete this.req.headers.accept
      this.OpenInOverleafController._sendResponse(this.req, this.res, project)
      sinon.assert.notCalled(this.res.json)
      return sinon.assert.calledWith(
        this.res.redirect,
        `/project/${this.project_id}`
      )
    })
  })
})
