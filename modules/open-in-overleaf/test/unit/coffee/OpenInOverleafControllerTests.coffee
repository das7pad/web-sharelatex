assert = require("chai").assert
sinon = require('sinon')
chai = require('chai')
should = chai.should()
expect = chai.expect
modulePath = "../../../app/js/OpenInOverleafController.js"
SandboxedModule = require('sandboxed-module')
ObjectId = require("mongojs").ObjectId

describe 'OpenInOverleafController', ->
	beforeEach ->
		@project_id = "123213jlkj9kdlsaj"
		@user =
			_id:"588f3ddae8ebc1bac07c9fa4"
			first_name: "bjkdsjfk"
			features: {}
		@snip = "snippety snip\nsnap snap"
		@comment = "% comment\n"
		@documentLines = ["% comment", "snippety snip", "snap snap"]
		@snippet =
			comment: @comment
			snip: @snip
			defaultTitle: "default_title"
		@snip_uri = 'http://snip.io/foo.tex'
		@tmpfile = '/tmp/foo.tex'
		@req =
			session:
				user: @user
			body: {}
			header: sinon.stub().withArgs('Referer').returns('https://example.org/1/2/3')
			i18n:
				translate: sinon.stub().returnsArg(0)
		@res = {}
		@ProjectModel = {}
		@ProjectModel.update = sinon.stub().callsArg(2)
		@ProjectCreationHandler =
			createProjectFromSnippet: sinon.stub().callsArgWith(3, null, {_id:@project_id})
		@ProjectDetailsHandler =
			generateUniqueName: sinon.stub().callsArgWith(2, null, "new_snippet_project")

		@OpenInOverleafHelper =
			getDocumentLinesFromSnippet: sinon.stub().returns((@comment + @snip).split("\n"))
		@Csrf =
			validateRequest: sinon.stub().callsArgWith(1, true)
		@AuthenticationController =
			getLoggedInUserId: sinon.stub().returns(@user._id)
		@DocumentHelper =
			getTitleFromTexContent: sinon.stub().returns("new_snippet_project")

		@OpenInOverleafController = SandboxedModule.require modulePath, requires:
			"logger-sharelatex":
				log:->
				err:->
			'../../../../app/js/Features/Authentication/AuthenticationController': @AuthenticationController
			'../../../../app/js/Features/Project/ProjectCreationHandler': @ProjectCreationHandler
			'../../../../app/js/Features/Project/ProjectDetailsHandler': @ProjectDetailsHandler
			'../../../../app/js/models/Project': {Project: @ProjectModel}
			'../../../../app/js/Features/Documents/DocumentHelper': @DocumentHelper
			'./OpenInOverleafHelper': @OpenInOverleafHelper

	describe "openInOverleaf", ->
		beforeEach ->
			@OpenInOverleafController._populateSnippetFromRequest = sinon.stub().callsArgWith(1, null, @snippet)

		describe "when there is a raw snippet", ->
			beforeEach ->
				@req.body.snip = @snip

			it "should process the snippet, create a project and redirect to it", (done)->
				@res.redirect = (url)=>
					sinon.assert.calledWith(@OpenInOverleafHelper.getDocumentLinesFromSnippet, @snippet)
					sinon.assert.calledWith(@ProjectCreationHandler.createProjectFromSnippet, @user._id, "new_snippet_project", @documentLines)
					url.should.equal '/project/' + @project_id
					done()
				@OpenInOverleafController.openInOverleaf @req, @res

			it "should update the project with the requested engine, if supplied", (done)->
				@req.body.engine = 'latex_dvipdf'
				@res.redirect = (url)=>
					sinon.assert.calledWith(@ProjectModel.update, sinon.match.any, {compiler: 'latex'})
					url.should.equal '/project/' + @project_id
					done()
				@OpenInOverleafController.openInOverleaf @req, @res

			it "should get the document title from the snippet", (done) ->
				@res.redirect = (url)=>
					sinon.assert.calledWith(@DocumentHelper.getTitleFromTexContent, @documentLines)
					sinon.assert.calledWith(@ProjectDetailsHandler.generateUniqueName, @user._id, "new_snippet_project")
					done()
				@OpenInOverleafController.openInOverleaf @req, @res

			it "should use the default title if the document has no title", (done) ->
				@res.redirect = (url)=>
					sinon.assert.calledWith(@DocumentHelper.getTitleFromTexContent, @documentLines)
					sinon.assert.calledWith(@ProjectDetailsHandler.generateUniqueName, @user._id, "default_title")
					done()
				@DocumentHelper.getTitleFromTexContent = sinon.stub().returns(null)
				@OpenInOverleafController.openInOverleaf @req, @res

		describe "when there is no snippet", ->
			it "should redirect to the root", (done)->
				@res.redirect = (url)=>
					sinon.assert.notCalled(@OpenInOverleafController._populateSnippetFromRequest)
					url.should.equal '/'
					done()
				delete @req.body.snip
				@OpenInOverleafController.openInOverleaf @req, @res

		describe "when there is an encoded snippet", ->
			beforeEach ->
				@req.body.encoded_snip = encodeURIComponent(@snip)

			it "should create a project and redirect to it", (done)->
				@res.redirect = (url)=>
					url.should.equal '/project/' + @project_id
					done()
				@OpenInOverleafController.openInOverleaf @req, @res

		describe "when there is a snippet uri", ->
			beforeEach ->
				@req.body.snip_uri = @snip_uri

			it "should create a project and redirect to it", (done)->
				@res.redirect = (url)=>
					url.should.equal '/project/' + @project_id
					done()
				@OpenInOverleafController.openInOverleaf @req, @res

		describe "when populating the snippet returns an error", ->
			beforeEach ->
				@req.body.snip_uri = @snip_uri
				@next = sinon.stub()
				@error = new Error('Something bad happened')
				@OpenInOverleafController._populateSnippetFromRequest = sinon.stub().callsArgWith(1, @error, null)

			it "should call the callback with an error", ->
				@OpenInOverleafController.openInOverleaf @req, @res, @next
				sinon.assert.calledWith(@next, @error)
				sinon.assert.notCalled(@OpenInOverleafHelper.getDocumentLinesFromSnippet)

	describe "_populateSnippetFromRequest", ->
		beforeEach ->
			@OpenInOverleafController._getMainFileCommentFromSnipRequest = sinon.stub().returns(@comment)

		it "should return a snippet object with a comment, snippet and default title", (done) ->
			@OpenInOverleafController._getSnippetContentsFromRequest = sinon.stub().callsArgWith(1, null, @snip)
			@OpenInOverleafController._populateSnippetFromRequest @req, (error, snippet) =>
				expect(error).not.to.exist
				snippet.snip.should.equal @snip
				snippet.comment.should.equal @comment
				snippet.defaultTitle.should.equal "new_snippet_project"
				done()

		it "should return an error if retrieving the snippet returns an error", (done) ->
			@OpenInOverleafController._getSnippetContentsFromRequest = sinon.stub().callsArgWith(1, new Error(), null)
			@OpenInOverleafController._populateSnippetFromRequest @req, (error, snippet) =>
				expect(error).to.exist
				expect(snippet).not.to.exist
				done()

		it "should return an error if there is no error, but no snippet", (done) ->
			@OpenInOverleafController._getSnippetContentsFromRequest = sinon.stub().callsArgWith(1, null, null)
			@OpenInOverleafController._populateSnippetFromRequest @req, (error, snippet) =>
				expect(error).to.exist
				expect(snippet).not.to.exist
				done()

	describe "_getMainFileCommentFromSnipRequest", ->
		it "should return the default comment by default", ->
			@OpenInOverleafController._getMainFileCommentFromSnipRequest(@req).should.equal "% default_snippet_comment\n"

		it "should return an empty string if no comment is requested", ->
			@req.body.comment = 'none'
			@OpenInOverleafController._getMainFileCommentFromSnipRequest(@req).should.equal ""

		it "should return the texample comment if the referrer is texample", ->
			@req.header = sinon.stub().withArgs('Referer').returns('https://asdf.texample.net/1/2/3')
			@OpenInOverleafController._getMainFileCommentFromSnipRequest(@req).should.equal "% texample_snippet_comment\n"
