/* eslint-disable
    handle-callback-err,
    max-len,
    no-return-assign,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const { assert } = require('chai')
const sinon = require('sinon')
const chai = require('chai')
const _ = require('underscore')
const should = chai.should()
const { expect } = chai
const modulePath = '../../../app/src/OpenInOverleafHelper.js'
const SandboxedModule = require('sandboxed-module')
const OpenInOverleafErrors = require('../../../app/src/OpenInOverleafErrors')

const mmmagic = { Magic: sinon.stub() }

describe('OpenInOverleafHelper', function() {
  beforeEach(function() {
    this.snip = 'snippety snip\nsnap snap'
    this.tmpfile = '/tmp/wombat.foo'
    this.templateUriPrefix = 'http://example.org/'
    mmmagic.Magic.prototype.detectFile = sinon
      .stub()
      .withArgs(this.tmpfile)
      .callsArgWith(1, null, 'text/x-tex')
    this.FileWriter = {
      writeUrlToDisk: sinon
        .stub()
        .withArgs('open_in_overleaf_snippet', this.snip_uri)
        .callsArgWith(2, null, this.tmpfile)
    }
    this.UrlHelper = { wrapUrlWithProxy: sinon.stub().returnsArg(0) }
    this.fs = {
      readFile: sinon
        .stub()
        .withArgs(this.tmpfile, { encoding: 'utf8' })
        .callsArgWith(2, null, this.snip)
    }
    this.settings = {
      openInOverleaf: {
        templateUriPrefix: this.templateUriPrefix
      }
    }
    this.ProjectEntityUpdateHandler = {
      addDoc: sinon.stub().callsArg(5),
      addFile: sinon.stub().callsArg(6)
    }
    this.ProjectRootDocManager = {
      setRootDocFromName: sinon.stub().callsArg(2)
    }
    this.ProjectOptionsHandler = {
      setCompiler: sinon.stub().callsArg(2),
      setBrandVariationId: sinon.stub().callsArg(2)
    }
    this.V1Api = {
      request: sinon.stub().callsArgWith(1, null, { statusCode: 404 }, {})
    }
    this.V1Api.request
      .withArgs({ uri: '/api/v2/brands/OSF' })
      .callsArgWith(
        1,
        null,
        { statusCode: 200 },
        { default_variation_id: 1234 }
      )
    this.V1Api.request
      .withArgs({ uri: '/api/v2/brand_variations/wombat' })
      .callsArgWith(1, null, { statusCode: 200 }, {})

    this.OpenInOverleafHelper = SandboxedModule.require(modulePath, {
      requires: {
        mmmagic: mmmagic,
        '../../../../app/src/infrastructure/FileWriter': this.FileWriter,
        '../../../../app/src/Features/Helpers/UrlHelper': this.UrlHelper,
        '../../../../app/src/Features/Project/ProjectRootDocManager': this
          .ProjectRootDocManager,
        '../../../../app/src/Features/Project/ProjectEntityUpdateHandler': this
          .ProjectEntityUpdateHandler,
        '../../../../app/src/Features/Project/ProjectOptionsHandler': this
          .ProjectOptionsHandler,
        '../../../../app/src/Features/V1/V1Api': this.V1Api,
        'settings-sharelatex': this.settings,
        fs: this.fs,
        'logger-sharelatex': {
          log() {},
          err() {}
        }
      }
    })

    this.snippet = {
      snip: this.snip,
      comment: '% commenty comment\n',
      defaultTitle: 'new_snippet_project'
    }
    this.snip_uri = 'http://snip.io/foo.tex'
    this.wrappedDocument = `\
\\documentclass[12pt]{article}
\\usepackage[english]{babel}
\\usepackage[utf8x]{inputenc}
\\usepackage{amsmath}
\\usepackage{tikz}
\\begin{document}
\\title{new_snippet_project}
snippety snip
snap snap
\\end{document}\
`
    return (this.OpenInOverleafHelper.TEMPLATE_DATA = {
      wombat: {
        brand_variation_id: null
      },
      potato: {
        brand_variation_id: 1234
      }
    })
  })

  describe('getDocumentLinesFromSnippet', function() {
    beforeEach(function() {
      this.OpenInOverleafHelper._normalizeMainSrcContent = sinon
        .stub()
        .returns(this.snippet.snip)
      return (this.result = this.OpenInOverleafHelper.getDocumentLinesFromSnippet(
        this.snippet
      ))
    })

    it('should return an array', function() {
      return expect(this.result).to.be.an('array')
    })

    it('should start with the comment, if provided', function() {
      return expect(this.result[0]).to.equal('% commenty comment')
    })

    return it('should normalize the content', function() {
      return expect(
        this.OpenInOverleafHelper._normalizeMainSrcContent.calledWith(
          this.snippet
        )
      ).to.equal(true)
    })
  })

  describe('normalizeLatexContent', function() {
    return it('returns the input', function() {
      return expect(
        this.OpenInOverleafHelper.normalizeLatexContent(this.snippet.snip)
      ).to.equal(this.snippet.snip)
    })
  })

  describe('populateSnippetFromUri', function() {
    beforeEach(function() {
      this.cb = sinon.stub()
      return (this.snippet = {})
    })

    describe('when downloading a .tex file', function() {
      beforeEach(function(done) {
        return this.OpenInOverleafHelper.populateSnippetFromUri(
          this.snip_uri,
          this.snippet,
          (err, result) => {
            this.err = err
            this.snippet = result
            return done()
          }
        )
      })

      it('wraps the snippet with the proxy', function() {
        return sinon.assert.calledWith(
          this.UrlHelper.wrapUrlWithProxy,
          this.snip_uri
        )
      })

      it('downloads the file with FileWriter', function() {
        return sinon.assert.calledWith(
          this.FileWriter.writeUrlToDisk,
          'open_in_overleaf_snippet',
          this.snip_uri
        )
      })

      it('detects the file type', function() {
        return sinon.assert.calledWith(
          mmmagic.Magic.prototype.detectFile,
          this.tmpfile
        )
      })

      it('reads the file contents', function() {
        return sinon.assert.calledWith(this.fs.readFile, this.tmpfile, {
          encoding: 'utf8'
        })
      })

      it('adds the .tex file contents to the snippet', function() {
        return expect(this.snippet.snip).to.equal(this.snip)
      })

      return it('calls the callback without an error', function() {
        return expect(this.err).not.to.exist
      })
    })

    describe('when downloading a zip file', function() {
      beforeEach(function(done) {
        mmmagic.Magic.prototype.detectFile = sinon
          .stub()
          .withArgs(this.tmpFile)
          .callsArgWith(1, null, 'application/zip')
        return this.OpenInOverleafHelper.populateSnippetFromUri(
          this.snip_uri,
          this.snippet,
          (err, result) => {
            this.err = err
            this.snippet = result
            return done()
          }
        )
      })

      it('detects the file type', function() {
        return sinon.assert.calledWith(
          mmmagic.Magic.prototype.detectFile,
          this.tmpfile
        )
      })

      it('adds the filesystem path to the snippet', function() {
        return expect(this.snippet.projectFile).to.equal(this.tmpfile)
      })

      return it('calls the callback without error', function() {
        return expect(this.err).not.to.exist
      })
    })

    describe('when downloading an incorrect file type', function() {
      beforeEach(function() {
        mmmagic.Magic.prototype.detectFile = sinon
          .stub()
          .withArgs(this.tmpfile)
          .callsArgWith(1, null, 'image/png')
        return this.OpenInOverleafHelper.populateSnippetFromUri(
          this.snip_uri,
          {},
          this.cb
        )
      })

      it('detects the file type', function() {
        return sinon.assert.calledWith(
          mmmagic.Magic.prototype.detectFile,
          this.tmpfile
        )
      })

      return it('raises an error', function() {
        return sinon.assert.calledWith(
          this.cb,
          new OpenInOverleafErrors.InvalidFileTypeError()
        )
      })
    })

    return describe('when trying to download an invalid uri', function() {
      return it('raises an invalid URI error', function(done) {
        return this.OpenInOverleafHelper.populateSnippetFromUri(
          'htt::/a',
          {},
          err => {
            expect(err.name).to.equal('InvalidUriError')
            return done()
          }
        )
      })
    })
  })

  describe('populateSnippetFromTemplate', function() {
    beforeEach(function() {
      this.cb = sinon.stub()
      this.snippet = {}
      this.fs.readFile.callsArgWith(2, null, this.templatesJson)
      this.FileWriter.writeUrlToDisk
        .withArgs(sinon.match.any, 'http://example.org/wombat.zip')
        .callsArgWith(2, null, '/tmp/wombat.zip')
      this.FileWriter.writeUrlToDisk
        .withArgs(sinon.match.any, 'http://example.org/potato.zip')
        .callsArgWith(2, null, '/tmp/potato.zip')
      return mmmagic.Magic.prototype.detectFile.callsArgWith(
        1,
        null,
        'application/zip'
      )
    })

    describe('when requesting a template that exists', function() {
      beforeEach(function(done) {
        return this.OpenInOverleafHelper.populateSnippetFromTemplate(
          'wombat',
          this.snippet,
          (err, result) => {
            this.err = err
            this.snippet = result
            return done()
          }
        )
      })

      it('should not raise an error', function() {
        return expect(this.err).not.to.exist
      })

      it('should download the zip file', function() {
        return sinon.assert.calledWith(
          this.UrlHelper.wrapUrlWithProxy,
          `${this.templateUriPrefix}wombat.zip`
        )
      })

      it('adds thefilesystem path to the snippet', function() {
        return expect(this.snippet.projectFile).to.equal(this.tmpfile)
      })

      return it('does not add a brand variation', function() {
        return expect(this.snippet.brandVariationId).not.to.exist
      })
    })

    describe('when requesting a template that has a brand variation', function() {
      beforeEach(function(done) {
        return this.OpenInOverleafHelper.populateSnippetFromTemplate(
          'potato',
          this.snippet,
          (err, result) => {
            this.err = err
            this.snippet = result
            return done()
          }
        )
      })

      it('should not raise an error', function() {
        return expect(this.err).not.to.exist
      })

      it('should download the zip file', function() {
        return sinon.assert.calledWith(
          this.UrlHelper.wrapUrlWithProxy,
          `${this.templateUriPrefix}potato.zip`
        )
      })

      it('adds thefilesystem path to the snippet', function() {
        return expect(this.snippet.projectFile).to.equal(this.tmpfile)
      })

      return it('does not add a brand variation', function() {
        return expect(this.snippet.brandVariationId).to.equal(1234)
      })
    })

    return describe('when requesting a template that does not exist', function() {
      beforeEach(function(done) {
        return this.OpenInOverleafHelper.populateSnippetFromTemplate(
          'banana',
          this.snippet,
          (err, result) => {
            this.err = err
            this.snippet = result
            return done()
          }
        )
      })

      it('should raise a template not found error', function() {
        return expect(this.err.name).to.equal('TemplateNotFoundError')
      })

      return it('should not try and download anything', function() {
        return sinon.assert.notCalled(this.UrlHelper.wrapUrlWithProxy)
      })
    })
  })

  describe('populateSnippetFromConversionJob', function() {
    beforeEach(function() {
      this.V1Api.request
        .withArgs({ uri: '/api/v2/partners/ieee_latexqc/conversions/wombat-1' })
        .callsArgWith(
          1,
          null,
          { statusCode: 200 },
          {
            brand_variation_id: null,
            input_file_uri: 'http://example.org/potato.zip'
          }
        )
      return this.V1Api.request
        .withArgs({ uri: '/api/v2/partners/OSF/conversions/wombat-1' })
        .callsArgWith(
          1,
          null,
          { statusCode: 200 },
          {
            brand_variation_id: '1234',
            input_file_uri: 'http://example.org/potato.zip'
          }
        )
    })

    describe('when the conversion job exists', function() {
      beforeEach(function(done) {
        return this.OpenInOverleafHelper.populateSnippetFromConversionJob(
          'OSF',
          'wombat-1',
          {},
          (err, snip) => {
            this.err = err
            this.snippet = snip
            return done()
          }
        )
      })

      it('should not raise an error', function() {
        return expect(this.err).not.to.exist
      })

      it('should add the brand variation id to the snippet', function() {
        return expect(this.snippet.brandVariationId).to.equal('1234')
      })

      return it('downloads the file', function() {
        return sinon.assert.calledWith(
          this.FileWriter.writeUrlToDisk,
          sinon.match.any,
          'http://example.org/potato.zip'
        )
      })
    })

    describe('when the conversion job exists, but has no brand variation', function() {
      beforeEach(function(done) {
        return this.OpenInOverleafHelper.populateSnippetFromConversionJob(
          'ieee_latexqc',
          'wombat-1',
          {},
          (err, snip) => {
            this.err = err
            this.snippet = snip
            return done()
          }
        )
      })

      it('should not raise an error', function() {
        return expect(this.err).not.to.exist
      })

      it('should not add a brand variation id to the snippet', function() {
        return expect(this.snippet.brandVariationId).not.to.exist
      })

      return it('downloads the file', function() {
        return sinon.assert.calledWith(
          this.FileWriter.writeUrlToDisk,
          sinon.match.any,
          'http://example.org/potato.zip'
        )
      })
    })

    return describe('when the conversion job does not exist', function() {
      beforeEach(function(done) {
        return this.OpenInOverleafHelper.populateSnippetFromConversionJob(
          'wombat_university',
          'wombat-1',
          {},
          (err, snip) => {
            this.err = err
            this.snippet = snip
            return done()
          }
        )
      })

      return it('should not raise an error', function() {
        return expect(this.err.name).to.equal('ConversionNotFoundError')
      })
    })
  })

  describe('populateSnippetFromUriArray', function() {
    beforeEach(function() {
      this.uris = [
        'http://a.aa/main.tex',
        'http://b.bb/main.tex',
        'http://c.cc/file.zip',
        'http://d.dd/a.tex',
        'http://e.ee/picard.gif',
        'http://f.ff/file'
      ]
      this.FileWriter.writeUrlToDisk = sinon
        .stub()
        .callsArgWith(2, new Error('URL not found'))
      this.FileWriter.writeUrlToDisk
        .withArgs(sinon.match.any, 'http://a.aa/main.tex')
        .callsArgWith(2, null, '/tmp/main.tex_1')
      this.FileWriter.writeUrlToDisk
        .withArgs(sinon.match.any, 'http://b.bb/main.tex')
        .callsArgWith(2, null, '/tmp/main.tex_2')
      this.FileWriter.writeUrlToDisk
        .withArgs(sinon.match.any, 'http://c.cc/file.zip')
        .callsArgWith(2, null, '/tmp/file.zip_1')
      this.FileWriter.writeUrlToDisk
        .withArgs(sinon.match.any, 'http://d.dd/a.tex')
        .callsArgWith(2, null, '/tmp/a.tex_1')
      this.FileWriter.writeUrlToDisk
        .withArgs(sinon.match.any, 'http://e.ee/picard.gif')
        .callsArgWith(2, null, '/tmp/picard.gif_1')
      this.FileWriter.writeUrlToDisk
        .withArgs(sinon.match.any, 'http://f.ff/file')
        .callsArgWith(2, null, '/tmp/file_1')
      mmmagic.Magic.prototype.detectFile = sinon
        .stub()
        .callsArgWith(1, new Error('File not found'))
      mmmagic.Magic.prototype.detectFile
        .withArgs('/tmp/main.tex_1')
        .callsArgWith(1, null, 'text/x-tex')
      mmmagic.Magic.prototype.detectFile
        .withArgs('/tmp/main.tex_2')
        .callsArgWith(1, null, 'text/x-tex')
      mmmagic.Magic.prototype.detectFile
        .withArgs('/tmp/file.zip_1')
        .callsArgWith(1, null, 'application/zip')
      mmmagic.Magic.prototype.detectFile
        .withArgs('/tmp/a.tex_1')
        .callsArgWith(1, null, 'text/x-tex')
      mmmagic.Magic.prototype.detectFile
        .withArgs('/tmp/picard.gif_1')
        .callsArgWith(1, null, 'image/gif')
      mmmagic.Magic.prototype.detectFile
        .withArgs('/tmp/file_1')
        .callsArgWith(1, null, 'text/plain')
      this.fs.readFile = sinon.stub().callsArgWith(2, null, 'Hello world')
      this.fs.readFile
        .withArgs('/tmp/a.tex_1')
        .callsArgWith(2, null, '\\title{wombat}')
      return (this.source = { wombat: 'potato' })
    })

    it('succeeds', function(done) {
      return this.OpenInOverleafHelper.populateSnippetFromUriArray(
        this.uris,
        this.source,
        error => {
          expect(error).not.to.exist
          return done()
        }
      )
    })

    it('downloads all of the URIs', function(done) {
      return this.OpenInOverleafHelper.populateSnippetFromUriArray(
        this.uris,
        this.source,
        () => {
          for (let u of Array.from(this.uris)) {
            sinon.assert.calledWith(
              this.FileWriter.writeUrlToDisk,
              sinon.match.any,
              u
            )
          }
          return done()
        }
      )
    })

    it('checks the filetypes of all the files', function(done) {
      return this.OpenInOverleafHelper.populateSnippetFromUriArray(
        this.uris,
        this.source,
        () => {
          sinon.assert.calledWith(
            mmmagic.Magic.prototype.detectFile,
            '/tmp/main.tex_1'
          )
          sinon.assert.calledWith(
            mmmagic.Magic.prototype.detectFile,
            '/tmp/main.tex_2'
          )
          sinon.assert.calledWith(
            mmmagic.Magic.prototype.detectFile,
            '/tmp/file.zip_1'
          )
          sinon.assert.calledWith(
            mmmagic.Magic.prototype.detectFile,
            '/tmp/a.tex_1'
          )
          sinon.assert.calledWith(
            mmmagic.Magic.prototype.detectFile,
            '/tmp/picard.gif_1'
          )
          sinon.assert.calledWith(
            mmmagic.Magic.prototype.detectFile,
            '/tmp/file_1'
          )
          return done()
        }
      )
    })

    it('reads the tex and text file contents, but not the binaries', function(done) {
      return this.OpenInOverleafHelper.populateSnippetFromUriArray(
        this.uris,
        this.source,
        () => {
          sinon.assert.calledWith(this.fs.readFile, '/tmp/main.tex_1')
          sinon.assert.calledWith(this.fs.readFile, '/tmp/main.tex_2')
          sinon.assert.calledWith(this.fs.readFile, '/tmp/a.tex_1')
          sinon.assert.calledWith(this.fs.readFile, '/tmp/file_1')
          sinon.assert.neverCalledWith(this.fs.readFile, '/tmp/file.zip_1')
          sinon.assert.neverCalledWith(this.fs.readFile, '/tmp/picard.gif_1')
          return done()
        }
      )
    })

    it('adds the file list to the snippet', function(done) {
      return this.OpenInOverleafHelper.populateSnippetFromUriArray(
        this.uris,
        this.source,
        (error, snippet) => {
          expect(snippet.files).to.be.a('Array')
          expect(snippet.files.length).to.equal(this.uris.length)
          return done()
        }
      )
    })

    it("keeps the snippet's original fields", function(done) {
      return this.OpenInOverleafHelper.populateSnippetFromUriArray(
        this.uris,
        this.source,
        (error, snippet) => {
          expect(snippet.wombat).to.equal('potato')
          return done()
        }
      )
    })

    it('extracts the filename from the URL', function(done) {
      return this.OpenInOverleafHelper.populateSnippetFromUriArray(
        this.uris,
        this.source,
        (error, snippet) => {
          const filenames = _.map(snippet.files, file => file.name)
          expect(filenames).to.include('main.tex')
          return done()
        }
      )
    })

    it('ensures the filenames are unique', function(done) {
      return this.OpenInOverleafHelper.populateSnippetFromUriArray(
        this.uris,
        this.source,
        (error, snippet) => {
          const filenames = _.map(snippet.files, file => file.name)
          expect(filenames).to.include('main (1).tex')
          return done()
        }
      )
    })

    it('reads the project title from the tex content', function(done) {
      return this.OpenInOverleafHelper.populateSnippetFromUriArray(
        this.uris,
        this.source,
        (error, snippet) => {
          expect(snippet.title).to.equal('wombat')
          return done()
        }
      )
    })

    return it('uses filenames from snip_name if supplied', function(done) {
      this.source.snip_name = ['1.tex', '2.tex', '3.tex']
      return this.OpenInOverleafHelper.populateSnippetFromUriArray(
        this.uris,
        this.source,
        (error, snippet) => {
          const filenames = _.map(snippet.files, file => file.name)
          expect(filenames[0]).to.equal('1.tex')
          expect(filenames[1]).to.equal('2.tex')
          expect(filenames[2]).to.equal('3.tex')
          return done()
        }
      )
    })
  })

  describe('populateProjectFromFileList', function() {
    beforeEach(function(done) {
      this.project = {
        _id: '1234',
        rootFolder: [{ _id: 'asdf' }]
      }
      this.snippet = {
        rootDoc: 'foo.tex',
        files: [
          { content: 'snippety snip\nsnap snap', name: 'foo.tex' },
          { content: 'blippety blip\nblop blop', name: 'bar.tex' },
          { fspath: '/foo/baz.zip', name: 'baz.zip' },
          { fspath: '/foo/qux.zip', name: 'qux.zip' }
        ],
        comment: '% commenty comment\n'
      }
      this.error = null
      return this.OpenInOverleafHelper.populateProjectFromFileList(
        this.project,
        this.snippet,
        error => {
          this.error = error
          return done()
        }
      )
    })

    it('succeeds', function() {
      return expect(this.error).not.to.exist
    })

    it('adds the tex files as documents', function() {
      return sinon.assert.calledTwice(this.ProjectEntityUpdateHandler.addDoc)
    })

    it('adds the zip files as files', function() {
      return sinon.assert.calledTwice(this.ProjectEntityUpdateHandler.addFile)
    })

    return it('sets the root document', function() {
      return sinon.assert.calledWith(
        this.ProjectRootDocManager.setRootDocFromName,
        sinon.match.any,
        'foo.tex'
      )
    })
  })

  describe('setProjectBrandVariationFromSlug', function() {
    beforeEach(function() {
      return (this.project = {
        _id: '1234'
      })
    })

    describe('when the slug exists in v1', function() {
      beforeEach(function(done) {
        return this.OpenInOverleafHelper.setProjectBrandVariationFromSlug(
          this.project,
          'OSF',
          err => {
            this.err = err
            return done()
          }
        )
      })

      it('calls the V1 API with the slug', function() {
        return sinon.assert.calledWith(this.V1Api.request, {
          uri: '/api/v2/brands/OSF'
        })
      })

      it('calls the callback without error', function() {
        return expect(this.err).to.be.falsey
      })

      return it('sets the brand variation for the project', function() {
        return sinon.assert.calledWith(
          this.ProjectOptionsHandler.setBrandVariationId,
          this.project._id,
          1234
        )
      })
    })

    return describe("when the slug doesn't exist in v1", function() {
      beforeEach(function(done) {
        return this.OpenInOverleafHelper.setProjectBrandVariationFromSlug(
          this.project,
          'wombat',
          err => {
            this.err = err
            return done()
          }
        )
      })

      it('calls the V1 API with the slug', function() {
        return sinon.assert.calledWith(this.V1Api.request, {
          uri: '/api/v2/brands/wombat'
        })
      })

      it('calls the callback with an error', function() {
        return expect(this.err.name).to.equal('PublisherNotFoundError')
      })

      return it('does not try to set the brand variation', function() {
        return sinon.assert.notCalled(
          this.ProjectOptionsHandler.setBrandVariationId
        )
      })
    })
  })

  describe('setProjectBrandVariationFromId', function() {
    beforeEach(function() {
      return (this.project = {
        _id: '1234'
      })
    })

    describe('when the brand variation id exists in v1', function() {
      beforeEach(function(done) {
        return this.OpenInOverleafHelper.setProjectBrandVariationFromId(
          this.project,
          'wombat',
          err => {
            this.err = err
            return done()
          }
        )
      })

      it('calls the V1 API with the variation id', function() {
        return sinon.assert.calledWith(this.V1Api.request, {
          uri: '/api/v2/brand_variations/wombat'
        })
      })

      it('calls the callback without error', function() {
        return expect(this.err).to.be.falsey
      })

      return it('sets the brand variation for the project', function() {
        return sinon.assert.calledWith(
          this.ProjectOptionsHandler.setBrandVariationId,
          this.project._id,
          'wombat'
        )
      })
    })

    return describe('when the brand variation id does not exist in v1', function() {
      beforeEach(function(done) {
        return this.OpenInOverleafHelper.setProjectBrandVariationFromId(
          this.project,
          'potato',
          err => {
            this.err = err
            return done()
          }
        )
      })

      it('calls the V1 API with the variation id', function() {
        return sinon.assert.calledWith(this.V1Api.request, {
          uri: '/api/v2/brand_variations/potato'
        })
      })

      it('calls the callback with an error', function() {
        return expect(this.err.name).to.equal('PublisherNotFoundError')
      })

      return it('does not try to set the brand variation', function() {
        return sinon.assert.notCalled(
          this.ProjectOptionsHandler.setBrandVariationId
        )
      })
    })
  })

  describe('_normalizeMainSrcContent', function() {
    beforeEach(function() {
      this.OpenInOverleafHelper.normalizeLatexContent = sinon
        .stub()
        .returnsArg(0)
      this.OpenInOverleafHelper._wrapSnippetIfNoDocumentClass = sinon
        .stub()
        .returns(this.wrappedDocument)
      return (this.result = this.OpenInOverleafHelper._normalizeMainSrcContent(
        this.snippet
      ))
    })

    it('should normalize the latex content', function() {
      return expect(
        this.OpenInOverleafHelper.normalizeLatexContent.calledWith(
          this.snippet.snip
        )
      ).to.equal(true)
    })

    return it('should wrap the snippet in a document block if necessary', function() {
      return expect(
        this.OpenInOverleafHelper._wrapSnippetIfNoDocumentClass.calledWith(
          this.snippet.snip,
          this.snippet.defaultTitle
        )
      ).to.equal(true)
    })
  })

  return describe('_wrapSnippetIfNoDocumentClass', function() {
    it('should wrap the snippet if there is no document class', function() {
      return expect(
        this.OpenInOverleafHelper._wrapSnippetIfNoDocumentClass(
          this.snippet.snip,
          this.snippet.defaultTitle
        )
      ).to.equal(this.wrappedDocument)
    })

    it('should not wrap the snippet if there is a document class', function() {
      return expect(
        this.OpenInOverleafHelper._wrapSnippetIfNoDocumentClass(
          this.wrappedDocument,
          this.snippet.defaultTitle
        )
      ).to.equal(this.wrappedDocument)
    })

    return it('should add a title when it wraps the document', function() {
      return expect(
        this.OpenInOverleafHelper._wrapSnippetIfNoDocumentClass(
          this.snippet.snip,
          'foo'
        )
      ).to.match(/^\\title{foo}$/m)
    })
  })
})
