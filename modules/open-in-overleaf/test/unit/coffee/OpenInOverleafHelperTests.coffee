assert = require("chai").assert
sinon = require('sinon')
chai = require('chai')
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

		@OpenInOverleafHelper = SandboxedModule.require modulePath, requires:
			'mmmagic': mmmagic
			'../../../../app/js/infrastructure/FileWriter': @FileWriter
			'../../../../app/js/Features/Helpers/UrlHelper': @UrlHelper
			'settings-sharelatex': @settings
			'fs': @fs
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
