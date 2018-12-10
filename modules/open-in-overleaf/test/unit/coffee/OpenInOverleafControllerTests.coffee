assert = require("chai").assert
sinon = require('sinon')
chai = require('chai')
_ = require('underscore')
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
			headers:
				accept: ['json']
			i18n:
				translate: sinon.stub().returnsArg(0)
		@res =
			setHeader: sinon.stub()
			send: sinon.stub()
			redirect: sinon.stub()
		@project = {_id:@project_id}
		@ProjectCreationHandler =
			createProjectFromSnippet: sinon.stub().callsArgWith(3, null, @project)
			createBlankProject: sinon.stub().callsArgWith(2, null, @project)
		@ProjectDetailsHandler =
			generateUniqueName: sinon.stub().callsArgWith(2, null, "new_snippet_project")
			fixProjectName: sinon.stub().returnsArg(0)
		@ProjectUploadManager =
			createProjectFromZipArchive: sinon.stub().callsArgWith(3, null, @project)

		@OpenInOverleafHelper =
			getDocumentLinesFromSnippet: sinon.stub().returns((@comment + @snip).split("\n"))
			setCompilerForProject: sinon.stub().callsArg(2)
			populateSnippetFromUri: sinon.stub().callsArgWith(2, null, @snippet)
			populateSnippetFromUriArray: sinon.stub().callsArgWith(
				2
				null
				_.extend({files: [{ctype: 'text/x-tex', content: @snip}, {ctype: 'application/zip', fspath: '/foo/bar.zip'}]}, @snippet, {snip: undefined})
			)
			populateProjectFromFileList: sinon.stub().callsArg(2)
			setProjectBrandVariationFromSlug: sinon.stub().callsArg(2)
		@Csrf =
			validateRequest: sinon.stub().callsArgWith(1, true)
		@AuthenticationController =
			getLoggedInUserId: sinon.stub().returns(@user._id)

		@OpenInOverleafController = SandboxedModule.require modulePath, requires:
			"logger-sharelatex":
				log:->
				err:->
			'../../../../app/js/Features/Authentication/AuthenticationController': @AuthenticationController
			'../../../../app/js/Features/Project/ProjectCreationHandler': @ProjectCreationHandler
			'../../../../app/js/Features/Project/ProjectDetailsHandler': @ProjectDetailsHandler
			'../../../../app/js/Features/Uploads/ProjectUploadManager': @ProjectUploadManager
			'./OpenInOverleafHelper': @OpenInOverleafHelper

	describe "openInOverleaf", ->
		describe "when there is a raw snippet", ->
			beforeEach ->
				@req.body.snip = @snip

			it "should process the snippet, create a project and redirect to it", (done)->
				@res.send = (content)=>
					sinon.assert.calledWith(@OpenInOverleafHelper.getDocumentLinesFromSnippet, sinon.match.has("snip", @snip))
					sinon.assert.calledWith(@ProjectCreationHandler.createProjectFromSnippet, @user._id, "new_snippet_project", @documentLines)
					sinon.assert.calledWith(@res.setHeader, 'Content-Type', 'application/json')
					content.should.equal JSON.stringify({redirect: '/project/' + @project_id})
					done()
				@OpenInOverleafController.openInOverleaf @req, @res

			it "should update the project with the requested engine, if supplied", (done)->
				@req.body.engine = 'latex_dvipdf'
				@res.send = =>
					sinon.assert.calledWith(@OpenInOverleafHelper.setCompilerForProject, sinon.match.any, 'latex_dvipdf')
					done()
				@OpenInOverleafController.openInOverleaf @req, @res

			it "should use the default title if the document has no title", (done) ->
				@res.send = =>
					sinon.assert.calledWith(@ProjectDetailsHandler.generateUniqueName, @user._id, "new_snippet_project")
					sinon.assert.called(@ProjectDetailsHandler.fixProjectName)
					done()
				@OpenInOverleafController.openInOverleaf @req, @res

			it "should use the document title from the snippet, if present", (done) ->
				@snip = "\\title{wombat}"
				@req.body.snip = @snip
				@OpenInOverleafHelper.getDocumentLinesFromSnippet = sinon.stub().returns((@comment + @snip).split("\n"))
				@res.send = =>
					sinon.assert.calledWith(@ProjectDetailsHandler.generateUniqueName, @user._id, "wombat")
					done()
				@OpenInOverleafController.openInOverleaf @req, @res

			it "should create a project with the snip name, if supplied", (done) ->
				@req.body.snip_name = 'potato'
				@OpenInOverleafHelper.getDocumentLinesFromSnippet = sinon.stub().returns((@comment + @snip).split("\n"))
				@res.send = =>
					sinon.assert.calledWith(@ProjectDetailsHandler.generateUniqueName, @user._id, "potato")
					done()
				@OpenInOverleafController.openInOverleaf @req, @res


		describe "when there is no snippet", ->
			it "should redirect to the root", (done)->
				@OpenInOverleafController._populateSnippetFromRequest = sinon.stub()
				@res.redirect = (url)=>
					sinon.assert.notCalled(@OpenInOverleafController._populateSnippetFromRequest)
					url.should.equal("/")
					done()
				delete @req.body.snip
				@OpenInOverleafController.openInOverleaf @req, @res

		describe "when there is an encoded snippet", ->
			beforeEach ->
				@req.body.encoded_snip = encodeURIComponent(@snip)

			it "should create a project and send a redirect to it", (done)->
				@res.send = (content)=>
					sinon.assert.calledWith(@res.setHeader, 'Content-Type', 'application/json')
					content.should.equal JSON.stringify({redirect: '/project/' + @project_id})
					done()
				@OpenInOverleafController.openInOverleaf @req, @res

		describe "when there is a snippet uri", ->
			beforeEach ->
				@req.body.snip_uri = @snip_uri

			it "should create a project and redirect to it", (done)->
				@res.send = (content)=>
					sinon.assert.calledWith(@res.setHeader, 'Content-Type', 'application/json')
					content.should.equal JSON.stringify({redirect: '/project/' + @project_id})
					done()
				@OpenInOverleafController.openInOverleaf @req, @res

		describe "when there is a snippet uri passed as zip_uri", ->
			beforeEach ->
				@req.body.zip_uri = @snip_uri

			it "should create a project and redirect to it", (done)->
				@res.send = (content)=>
					sinon.assert.calledWith(@res.setHeader, 'Content-Type', 'application/json')
					content.should.equal JSON.stringify({redirect: '/project/' + @project_id})
					done()
				@OpenInOverleafController.openInOverleaf @req, @res

		describe "when there is an array of uris", ->
			beforeEach ->
				@req.body.snip_uri = [@snip_uri, 'http://foo.net/foo.tex']

			it "should create a project and redirect to it", (done)->
				@res.send = (content)=>
					sinon.assert.calledWith(@res.setHeader, 'Content-Type', 'application/json')
					content.should.equal JSON.stringify({redirect: '/project/' + @project_id})
					done()
				@OpenInOverleafController.openInOverleaf @req, @res

			it "should cate a blank project and populate it with a list of files", (done)->
				@res.send = =>
					sinon.assert.called(@ProjectDetailsHandler.generateUniqueName)
					sinon.assert.called(@ProjectDetailsHandler.fixProjectName)
					sinon.assert.called(@ProjectCreationHandler.createBlankProject)
					sinon.assert.called(@OpenInOverleafHelper.populateProjectFromFileList)
					done()
				@OpenInOverleafController.openInOverleaf @req, @res

		describe "when the snippet uri is a zip file", ->
			beforeEach ->
				@req.body.snip_uri = "http://foo.net/foo.zip"
				@OpenInOverleafHelper.populateSnippetFromUri = sinon.stub().callsArgWith(2, null, {
						projectFile: '/foo/bar.zip'
						defaultTitle: "new_snippet_project"
				})

			it "should create a project from the zip file and redirect to it", (done)->
				@res.send = (content)=>
					sinon.assert.calledWith(@ProjectUploadManager.createProjectFromZipArchive, @user._id, "foo", "/foo/bar.zip")
					sinon.assert.calledWith(@res.setHeader, 'Content-Type', 'application/json')
					content.should.equal JSON.stringify({redirect: '/project/' + @project_id})
					done()
				@OpenInOverleafController.openInOverleaf @req, @res

			it "should use the snip_name if supplied", (done) ->
				@OpenInOverleafHelper.populateSnippetFromUri = sinon.stub().callsArgWith(2, null, {
					projectFile: '/foo/bar.zip'
					defaultTitle: "new_snippet_project"
					snip_name: 'potato'
				})
				@res.send = (content)=>
					sinon.assert.calledWith(@ProjectUploadManager.createProjectFromZipArchive, @user._id, "potato", "/foo/bar.zip")
					content.should.equal JSON.stringify({redirect: '/project/' + @project_id})
					done()
				@OpenInOverleafController.openInOverleaf @req, @res

		describe "when there is a publisher slug", ->
			beforeEach ->
				@req.body.snip_uri = "#{@snip_uri}.zip"
				@OpenInOverleafController._populateSnippetFromRequest = sinon.stub().callsArgWith(1, null, {
					projectFile: '/foo/bar.zip'
					defaultTitle: "new_snippet_project"
					publisherSlug: 'OSF'
				})

			it "should set the brand variation on the project", (done)->
				@res.send = (content)=>
					sinon.assert.calledWith(@OpenInOverleafHelper.setProjectBrandVariationFromSlug, sinon.match.any, "OSF")
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
			@OpenInOverleafController._getSnippetContentsFromRequest = sinon.stub().callsArgWith(1, null, {snip: @snip})
			@OpenInOverleafController._populateSnippetFromRequest @req, (error, snippet) =>
				expect(error).not.to.exist
				snippet.snip.should.equal @snip
				snippet.comment.should.equal @comment
				snippet.defaultTitle.should.equal "new_snippet_project"
				done()

		it "should add the engine to the snippet, if present", (done) ->
			@req.body.engine = 'latex_dvipdf'
			@OpenInOverleafController._getSnippetContentsFromRequest = sinon.stub().callsArgWith(1, null, {snip: @snip})
			@OpenInOverleafController._populateSnippetFromRequest @req, (error, snippet) =>
				expect(error).not.to.exist
				expect(snippet.engine).to.exist
				snippet.engine.should.equal 'latex_dvipdf'
				done()

		it "should return an error if retrieving the snippet returns an error", (done) ->
			@OpenInOverleafController._getSnippetContentsFromRequest = sinon.stub().callsArgWith(1, new Error())
			@OpenInOverleafController._populateSnippetFromRequest @req, (error, snippet) =>
				expect(error).to.exist
				done()

		it "should return an error if there is no error, but no snippet", (done) ->
			@OpenInOverleafController._getSnippetContentsFromRequest = sinon.stub().callsArgWith(1, null, {})
			@OpenInOverleafController._populateSnippetFromRequest @req, (error, snippet) =>
				expect(error).to.exist
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

	describe "_sendResponse", ->
		it "should send a json response for xhr requests", ->
			project =
				_id: @project_id
			@OpenInOverleafController._sendResponse(@req, @res, project)
			sinon.assert.calledWith(@res.setHeader, 'Content-Type', 'application/json')
			sinon.assert.calledWith(@res.send, JSON.stringify({redirect: "/project/#{@project_id}"}))
			sinon.assert.notCalled(@res.redirect)

		it "should send a redirect for standard requests", ->
			project =
				_id: @project_id
			delete @req.headers.accept
			@OpenInOverleafController._sendResponse(@req, @res, project)
			sinon.assert.notCalled(@res.setHeader)
			sinon.assert.notCalled(@res.send)
			sinon.assert.calledWith(@res.redirect, "/project/#{@project_id}")
