assert = require("chai").assert
sinon = require('sinon')
chai = require('chai')
_ = require('underscore')
should = chai.should()
expect = chai.expect
modulePath = "../../../app/js/OpenInOverleafHelper.js"
SandboxedModule = require('sandboxed-module')

mmmagic =
	Magic: sinon.stub()

mmmagic.Magic::detectFile = sinon.stub().withArgs(@tmpFile).callsArgWith(1, null, 'text/x-tex')

describe 'OpenInOverleafHelper', ->
	beforeEach ->
		@FileWriter =
			writeUrlToDisk: sinon.stub().withArgs('open_in_overleaf_snippet', @snip_uri).callsArgWith(2, null, @tmpfile)
		@UrlHelper =
			wrapUrlWithProxy: sinon.stub().returnsArg(0)
		@fs =
			readFile: sinon.stub().withArgs(@tmpfile, encoding: 'utf8').callsArgWith(2, null, @snip)
		@settings = {}
		@ProjectEntityUpdateHandler =
			addDoc: sinon.stub().callsArg(5)
			addFile: sinon.stub().callsArg(6)
		@ProjectRootDocManager =
			setRootDocFromName: sinon.stub().callsArg(2)
		@ProjectModel = {}
		@ProjectModel.update = sinon.stub().callsArg(2)

		@OpenInOverleafHelper = SandboxedModule.require modulePath, requires:
			'mmmagic': mmmagic
			'../../../../app/js/infrastructure/FileWriter': @FileWriter
			'../../../../app/js/Features/Helpers/UrlHelper': @UrlHelper
			'../../../../app/js/Features/Project/ProjectRootDocManager': @ProjectRootDocManager
			'../../../../app/js/Features/Project/ProjectEntityUpdateHandler': @ProjectEntityUpdateHandler
			'../../../../app/js/models/Project': {Project: @ProjectModel}
			'settings-sharelatex': @settings
			'fs': @fs
			'logger-sharelatex':
				log:->
				err:->

		@snippet =
			snip: "snippety snip\nsnap snap"
			comment: "% commenty comment\n"
			defaultTitle: "new_snippet_project"
		@snip_uri = 'http://snip.io/foo.tex'
		@wrappedDocument = """
\\documentclass[12pt]{article}
\\usepackage[english]{babel}
\\usepackage[utf8x]{inputenc}
\\usepackage{amsmath}
\\usepackage{tikz}
\\begin{document}
\\title{new_snippet_project}
snippety snip
snap snap
\\end{document}
"""

	describe 'getDocumentLinesFromSnippet', ->
		beforeEach ->
			@OpenInOverleafHelper._normalizeMainSrcContent = sinon.stub().returns(@snippet.snip)
			@result = @OpenInOverleafHelper.getDocumentLinesFromSnippet(@snippet)

		it 'should return an array', ->
			expect(@result).to.be.an('array')

		it 'should start with the comment, if provided', ->
			expect(@result[0]).to.equal "% commenty comment"

		it 'should normalize the content', ->
			expect(@OpenInOverleafHelper._normalizeMainSrcContent.calledWith(@snippet)).to.equal true

	describe 'normalizeLatexContent', ->
# TODO: handle non-UTF8 content and make best effort to convert.
# see: https://github.com/overleaf/write_latex/blob/master/main/lib/text_normalization.rb
		it 'returns the input', ->
			expect(@OpenInOverleafHelper.normalizeLatexContent(@snippet.snip)).to.equal @snippet.snip

	describe "populateSnippetFromUri", ->
		beforeEach ->
			@cb = sinon.stub()
			@snippet = {}

		describe "when downloading a .tex file", ->
			beforeEach ->
				@OpenInOverleafHelper.populateSnippetFromUri(@snip_uri, @snippet, @cb)

			it "wraps the snippet with the proxy", ->
				sinon.assert.calledWith(@UrlHelper.wrapUrlWithProxy, @snip_uri)

			it "downloads the file with FileWriter", ->
				sinon.assert.calledWith(@FileWriter.writeUrlToDisk, 'open_in_overleaf_snippet', @snip_uri)

			it "detects the file type", ->
				sinon.assert.calledWith(mmmagic.Magic::detectFile, @tmpfile)

			it "reads the file contents", ->
				sinon.assert.calledWith(@fs.readFile, @tmpfile, {encoding: 'utf8'})

			it "adds the .tex file contents to the snippet", ->
				expect(@snippet.snip).to.equal @snip

			it "calls the callback without an error", ->
				sinon.assert.calledWith(@cb, null)

		describe "when downloading a zip file", ->
			beforeEach ->
				mmmagic.Magic::detectFile = sinon.stub().withArgs(@tmpFile).callsArgWith(1, null, 'application/zip')
				@OpenInOverleafHelper.populateSnippetFromUri(@snip_uri, @snippet, @cb)

			it "detects the file type", ->
				sinon.assert.calledWith(mmmagic.Magic::detectFile, @tmpfile)

			it "adds the filesystem path to the snippet", ->
				expect(@snippet.projectFile).to.equal @tmpfile

			it "calls the callback without error", ->
				sinon.assert.calledWith(@cb, null)

		describe "when downloading an incorrect file type", ->
			beforeEach ->
				mmmagic.Magic::detectFile = sinon.stub().withArgs(@tmpFile).callsArgWith(1, null, 'image/png')
				@OpenInOverleafHelper.populateSnippetFromUri(@snip_uri, {}, @cb)

			it "detects the file type", ->
				sinon.assert.calledWith(mmmagic.Magic::detectFile, @tmpfile)

			it "raises an error", ->
				sinon.assert.calledWith(@cb, new Error())

	describe 'populateSnippetFromUriArray', ->
		beforeEach ->
			@uris = [
				"http://a.aa/main.tex",
				"http://b.bb/main.tex",
				"http://c.cc/file.zip",
				"http://d.dd/a.tex",
				"http://e.ee/picard.gif"
				"http://f.ff/file"
			]
			@FileWriter.writeUrlToDisk = sinon.stub().callsArgWith(2, new Error("URL not found"))
			@FileWriter.writeUrlToDisk.withArgs(sinon.match.any, "http://a.aa/main.tex").callsArgWith(2, null, "/tmp/main.tex_1")
			@FileWriter.writeUrlToDisk.withArgs(sinon.match.any, "http://b.bb/main.tex").callsArgWith(2, null, "/tmp/main.tex_2")
			@FileWriter.writeUrlToDisk.withArgs(sinon.match.any, "http://c.cc/file.zip").callsArgWith(2, null, "/tmp/file.zip_1")
			@FileWriter.writeUrlToDisk.withArgs(sinon.match.any, "http://d.dd/a.tex").callsArgWith(2, null, "/tmp/a.tex_1")
			@FileWriter.writeUrlToDisk.withArgs(sinon.match.any, "http://e.ee/picard.gif").callsArgWith(2, null, "/tmp/picard.gif_1")
			@FileWriter.writeUrlToDisk.withArgs(sinon.match.any, "http://f.ff/file").callsArgWith(2, null, "/tmp/file_1")
			mmmagic.Magic::detectFile = sinon.stub().callsArgWith(1, new Error("File not found"))
			mmmagic.Magic::detectFile.withArgs("/tmp/main.tex_1").callsArgWith(1, null, 'text/x-tex')
			mmmagic.Magic::detectFile.withArgs("/tmp/main.tex_2").callsArgWith(1, null, 'text/x-tex')
			mmmagic.Magic::detectFile.withArgs("/tmp/file.zip_1").callsArgWith(1, null, 'application/zip')
			mmmagic.Magic::detectFile.withArgs("/tmp/a.tex_1").callsArgWith(1, null, 'text/x-tex')
			mmmagic.Magic::detectFile.withArgs("/tmp/picard.gif_1").callsArgWith(1, null, 'image/gif')
			mmmagic.Magic::detectFile.withArgs("/tmp/file_1").callsArgWith(1, null, 'text/plain')
			@fs.readFile = sinon.stub().callsArgWith(2, null, "Hello world")
			@fs.readFile.withArgs("/tmp/a.tex_1").callsArgWith(2, null, "\\title{wombat}")
			@source = {wombat: 'potato'}

		it 'succeeds', (done) ->
			@OpenInOverleafHelper.populateSnippetFromUriArray @uris, @source, (error) ->
				expect(error).not.to.exist
				done()

		it 'downloads all of the URIs', (done) ->
			@OpenInOverleafHelper.populateSnippetFromUriArray @uris, @source, =>
				for u in @uris
					sinon.assert.calledWith(@FileWriter.writeUrlToDisk, sinon.match.any, u)
				done()

		it 'checks the filetypes of all the files', (done) ->
			@OpenInOverleafHelper.populateSnippetFromUriArray @uris, @source, =>
				sinon.assert.calledWith(mmmagic.Magic::detectFile, "/tmp/main.tex_1")
				sinon.assert.calledWith(mmmagic.Magic::detectFile, "/tmp/main.tex_2")
				sinon.assert.calledWith(mmmagic.Magic::detectFile, "/tmp/file.zip_1")
				sinon.assert.calledWith(mmmagic.Magic::detectFile, "/tmp/a.tex_1")
				sinon.assert.calledWith(mmmagic.Magic::detectFile, "/tmp/picard.gif_1")
				sinon.assert.calledWith(mmmagic.Magic::detectFile, "/tmp/file_1")
				done()

		it 'reads the tex and text file contents, but not the binaries', (done) ->
			@OpenInOverleafHelper.populateSnippetFromUriArray @uris, @source, =>
				sinon.assert.calledWith(@fs.readFile, "/tmp/main.tex_1")
				sinon.assert.calledWith(@fs.readFile, "/tmp/main.tex_2")
				sinon.assert.calledWith(@fs.readFile, "/tmp/a.tex_1")
				sinon.assert.calledWith(@fs.readFile, "/tmp/file_1")
				sinon.assert.neverCalledWith(@fs.readFile, "/tmp/file.zip_1")
				sinon.assert.neverCalledWith(@fs.readFile, "/tmp/picard.gif_1")
				done()

		it 'adds the file list to the snippet', (done) ->
			@OpenInOverleafHelper.populateSnippetFromUriArray @uris, @source, (error, snippet) =>
				expect(snippet.files).to.be.a 'Array'
				expect(snippet.files.length).to.equal @uris.length
				done()

		it "keeps the snippet's original fields", (done) ->
			@OpenInOverleafHelper.populateSnippetFromUriArray @uris, @source, (error, snippet) =>
				expect(snippet.wombat).to.equal 'potato'
				done()

		it 'extracts the filename from the URL', (done) ->
			@OpenInOverleafHelper.populateSnippetFromUriArray @uris, @source, (error, snippet) =>
				filenames = _.map(snippet.files, (file) -> file.name)
				expect(filenames).to.include('main.tex')
				done()

		it 'ensures the filenames are unique', (done) ->
			@OpenInOverleafHelper.populateSnippetFromUriArray @uris, @source, (error, snippet) =>
				filenames = _.map(snippet.files, (file) -> file.name)
				expect(filenames).to.include('main (1).tex')
				done()

		it 'reads the project title from the tex content', (done) ->
			@OpenInOverleafHelper.populateSnippetFromUriArray @uris, @source, (error, snippet) =>
				expect(snippet.title).to.equal 'wombat'
				done()

		it 'uses filenames from snip_name if supplied', (done) ->
			@source.snip_name = ['1.tex', '2.tex', '3.tex']
			@OpenInOverleafHelper.populateSnippetFromUriArray @uris, @source, (error, snippet) =>
				filenames = _.map(snippet.files, (file) -> file.name)
				expect(filenames[0]).to.equal('1.tex')
				expect(filenames[1]).to.equal('2.tex')
				expect(filenames[2]).to.equal('3.tex')
				done()

	describe "populateProjectFromFileList", ->
		beforeEach (done) ->
			@project = {
				_id: "1234"
				rootFolder: [{_id: 'asdf'}]
			}
			@snippet =
				rootDoc: 'foo.tex'
				files: [
					{content: "snippety snip\nsnap snap", name: 'foo.tex'},
					{content: "blippety blip\nblop blop", name: 'bar.tex'},
					{fspath: '/foo/baz.zip', name: 'baz.zip'},
					{fspath: '/foo/qux.zip', name: 'qux.zip'}
				]
				comment: "% commenty comment\n"
			@error = null
			@OpenInOverleafHelper.populateProjectFromFileList @project, @snippet, (error) =>
				@error = error
				done()

		it "succeeds", ->
			expect(@error).not.to.exist

		it "adds the tex files as documents", ->
			sinon.assert.calledTwice(@ProjectEntityUpdateHandler.addDoc)

		it "adds the zip files as files", ->
			sinon.assert.calledTwice(@ProjectEntityUpdateHandler.addFile)

		it "sets the root document", ->
			sinon.assert.calledWith(@ProjectRootDocManager.setRootDocFromName, sinon.match.any, 'foo.tex')

	describe '_normalizeMainSrcContent', ->
		beforeEach ->
			@OpenInOverleafHelper.normalizeLatexContent = sinon.stub().returnsArg(0)
			@OpenInOverleafHelper._wrapSnippetIfNoDocumentClass = sinon.stub().returns(@wrappedDocument)
			@result = @OpenInOverleafHelper._normalizeMainSrcContent(@snippet)

		it 'should normalize the latex content', ->
			expect(@OpenInOverleafHelper.normalizeLatexContent.calledWith(@snippet.snip)).to.equal true

		it 'should wrap the snippet in a document block if necessary', ->
			expect(@OpenInOverleafHelper._wrapSnippetIfNoDocumentClass.calledWith(@snippet.snip, @snippet.defaultTitle)).to.equal true

	describe '_wrapSnippetIfNoDocumentClass', ->
		it 'should wrap the snippet if there is no document class', ->
			expect(@OpenInOverleafHelper._wrapSnippetIfNoDocumentClass(@snippet.snip, @snippet.defaultTitle)).to.equal @wrappedDocument

		it 'should not wrap the snippet if there is a document class', ->
			expect(@OpenInOverleafHelper._wrapSnippetIfNoDocumentClass(@wrappedDocument, @snippet.defaultTitle)).to.equal @wrappedDocument

		it 'should add a title when it wraps the document', ->
			expect(@OpenInOverleafHelper._wrapSnippetIfNoDocumentClass(@snippet.snip, "foo")).to.match /^\\title{foo}$/m
