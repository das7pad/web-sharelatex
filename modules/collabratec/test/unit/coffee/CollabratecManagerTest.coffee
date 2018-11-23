ObjectId = require("mongojs").ObjectId
Path = require "path"
SandboxedModule = require "sandboxed-module"
assert = require "assert"
chai = require "chai"
sinon = require "sinon"
sinonChai = require "sinon-chai"

chai.use sinonChai
expect = chai.expect

modulePath = Path.join __dirname, "../../../app/js/CollabratecManager"

describe "CollabratecManager", ->
	beforeEach ->
		@CollabratecManager = SandboxedModule.require modulePath, requires:
			"../../../../app/js/Features/DocumentUpdater/DocumentUpdaterHandler":
				@DocumentUpdaterHandler = {}
			"../../../../app/js/Features/Errors/Errors": @Errors = {
				NotFoundError: sinon.stub()
			}
			"../../../../app/js/Features/Project/ProjectCollabratecDetailsHandler": @ProjectCollabratecDetailsHandler = {}
			"../../../../app/js/Features/Project/ProjectDeleter": @ProjectDeleter = {}
			"../../../../app/js/Features/Project/ProjectDetailsHandler": @ProjectDetailsHandler = {}
			"../../../../app/js/Features/Project/ProjectEntityHandler": @ProjectEntityHandler = {}
			"../../../../app/js/Features/Project/ProjectEntityUpdateHandler": @ProjectEntityUpdateHandler = {}
			"../../../../app/js/Features/Project/ProjectGetter": @ProjectGetter = {}
			"../../../../app/js/Features/Project/ProjectRootDocManager":
				@ProjectRootDocManager = {}
			"../../../../app/js/Features/Templates/TemplatesManager": @TemplatesManager = {}
			"../../../../app/js/Features/V1/V1Api": @V1Api = {}
			"logger-sharelatex": { log: sinon.stub(), err: sinon.stub() }
			"settings-sharelatex": { siteUrl: "site-url" }
		@callback = sinon.stub()
		@lines = [
			"\\documentclass{IEEEtran}",
			"\\begin{document}",
			"\\author{Test Author}"
			"\\title{Test Title}",
			"\\begin{abstract}",
			"Test abstract.",
			"It spans two lines.",
			"\\end{abstract}",
			"\\begin{IEEEkeywords}",
			"keyword one, keyword two",
			"\\end{IEEEkeywords}",
			"\\end{document}",
		]

	describe "getProjectMetadata", ->
		beforeEach ->
			@user =
				_id: "user-id"
			@ProjectRootDocManager.ensureRootDocumentIsValid = sinon.stub().yields()
			@DocumentUpdaterHandler.flushDocToMongo = sinon.stub().yields()

		describe "when project_id is found", ->

			describe "when project has rootDoc_id", ->
				beforeEach ->
					@project =
						_id: ObjectId("5bd9b0232688a3011fd7cb4c")
						lastUpdated: "2018-11-01 10:00:00Z"
						rootDoc_id: "root-doc-id"
						name: "project-title"
					@ProjectGetter.getProject = sinon.stub().yields null, @project

				describe "when doc is found", ->
					beforeEach ->
						@ProjectEntityHandler.getDoc = sinon.stub().yields null, @lines

					it "should callback with project metadata", ->
						@CollabratecManager.getProjectMetadata "project-id", @callback
						expect(@callback).to.have.been.calledWith null, {
							title: "project-title",
							doc_abstract: "Test abstract. It spans two lines.",
							primary_author: "Test Author",
							keywords: [ "keyword one", "keyword two" ],
							created_at: 1540993059000,
							updated_at: 1541066400000,
							url: "site-url/project/5bd9b0232688a3011fd7cb4c"
						}

				describe "when error occurs with getDoc", ->
					beforeEach ->
						@ProjectEntityHandler.getDoc = sinon.stub().yields "error"

					it "should callback with error", ->
						@CollabratecManager.getProjectMetadata "project-id", @callback
						expect(@callback).to.have.been.calledWith "error"

			describe "when project does not have rootDoc_id", ->
				beforeEach ->
					@project =
						_id: ObjectId("5bd9b0232688a3011fd7cb4c")
						lastUpdated: "2018-11-01 10:00:00Z"
						name: "project-title"
					@ProjectGetter.getProject = sinon.stub().yields null, @project

				it "should callback with limited metadata", ->
					@CollabratecManager.getProjectMetadata "project-id", @callback
					expect(@callback).to.have.been.calledWith null, {
						title: "project-title",
						created_at: 1540993059000,
						updated_at: 1541066400000,
						url: "site-url/project/5bd9b0232688a3011fd7cb4c"
					}

		describe "when project id is not found", ->
			beforeEach ->
				@ProjectGetter.getProject = sinon.stub().yields "error"

			it "should callback with error", ->
				@CollabratecManager.getProjectMetadata "project-id", @callback
				expect(@callback).to.have.been.calledWith "error"

	describe "createProject", ->
		describe "when template request succeeds", ->
			beforeEach ->
				@template =
					pub:
						doc_id: "doc-id"
						published_ver_id: "published-ver-id"
				@V1Api.request = sinon.stub().yields null, {}, @template
				@TemplatesManager.createProjectFromV1Template = sinon.stub()
				@CollabratecManager.createProject "user-id", "template-id", "title", "doc-abstract", ["keyword-1", "keyword-2"], "author", "collabratec-document-id", "collabratec-privategroup-id", @callback

			it "should create project", ->
				expect(@TemplatesManager.createProjectFromV1Template).to.have.been.calledOnce.and.calledWithMatch null, null, null, "doc-id", "title", "published-ver-id", "user-id"

			describe "when create project succeeds", ->
				beforeEach ->
					@project =
						_id: "project-id"
					@CollabratecManager._injectProjectMetadata = sinon.stub()
					@TemplatesManager.createProjectFromV1Template.yields null, @project
					@CollabratecManager.createProject "user-id", "template-id", "title", "doc-abstract", ["keyword-1", "keyword-2"], "author", "collabratec-document-id", "collabratec-privategroup-id", @callback

				it "should inject project metadata", ->
					expect(@CollabratecManager._injectProjectMetadata).to.have.been.calledOnce.and.calledWithMatch "user-id", @project, "title", "doc-abstract", ["keyword-1", "keyword-2"]

				describe "when inject project metadata succeeds", ->
					beforeEach ->
						@CollabratecManager._injectProjectMetadata = sinon.stub().yields()
						@ProjectCollabratecDetailsHandler.initializeCollabratecProject = sinon.stub()
						@CollabratecManager.createProject "user-id", "template-id", "title", "doc-abstract", ["keyword-1", "keyword-2"], "author", "collabratec-document-id", "collabratec-privategroup-id", @callback

					it "should initialize project record", ->
						expect(@ProjectCollabratecDetailsHandler.initializeCollabratecProject).to.have.been.calledOnce.and.calledWithMatch "project-id", "user", "collabratec-document-id", "collabratec-privategroup-id"

					describe "when initialize project succeeds", ->
						beforeEach ->
							@ProjectCollabratecDetailsHandler.initializeCollabratecProject.yields()
							@CollabratecManager.createProject "user-id", "template-id", "title", "doc-abstract", ["keyword-1", "keyword-2"], "author", "collabratec-document-id", "collabratec-privategroup-id", @callback

						it "should callback with result", ->
							expect(@callback).to.have.been.calledOnce.and.calledWith(null, {
									id: "project-id"
									url: "site-url/project/project-id"
								})

					describe "when initialize project returns error", ->
						beforeEach ->
							@ProjectCollabratecDetailsHandler.initializeCollabratecProject.yields("error")
							@CollabratecManager.createProject "user-id", "template-id", "title", "doc-abstract", ["keyword-1", "keyword-2"], "author", "collabratec-document-id", "collabratec-privategroup-id", @callback

						it "should callback with error", ->
							expect(@callback).to.have.been.calledOnce.and.calledWith("error")

				describe "when inject project metadata returns error", ->
					beforeEach ->
						@CollabratecManager._injectProjectMetadata = sinon.stub().yields("error")
						@ProjectCollabratecDetailsHandler.initializeCollabratecProject = sinon.stub()
						@CollabratecManager.createProject "user-id", "template-id", "title", "doc-abstract", ["keyword-1", "keyword-2"], "author", "collabratec-document-id", "collabratec-privategroup-id", @callback

					it "should callback with error", ->
						expect(@callback).to.have.been.calledOnce.and.calledWith("error")

					it "should not inject project metadata", ->
						expect(@ProjectCollabratecDetailsHandler.initializeCollabratecProject).not.to.have.been.called

			describe "when create project returns error", ->
				beforeEach ->
					@CollabratecManager._injectProjectMetadata = sinon.stub()
					@TemplatesManager.createProjectFromV1Template.yields "error"
					@CollabratecManager.createProject "user-id", "template-id", "title", "doc-abstract", ["keyword-1", "keyword-2"], "author", "collabratec-document-id", "collabratec-privategroup-id", @callback

				it "should callback with error", ->
					expect(@callback).to.have.been.calledOnce.and.calledWith("error")

				it "should not inject project metadata", ->
					expect(@CollabratecManager._injectProjectMetadata).not.to.have.been.called

		describe "when template request returns error", ->
			beforeEach ->
				@V1Api.request = sinon.stub().yields "error"
				@TemplatesManager.createProjectFromV1Template = sinon.stub()
				@CollabratecManager.createProject "user-id", "template-id", "title", "doc-abstract", ["keyword-1", "keyword-2"], "author", "collabratec-document-id", "collabratec-privategroup-id", @callback

			it "should callback with error", ->
				expect(@callback).to.have.been.calledOnce.and.calledWith("error")

			it "should not create project", ->
				expect(@TemplatesManager.createProjectFromV1Template).not.to.have.been.called

		describe "when template request returns 404", ->
			beforeEach ->
				@V1Api.request = sinon.stub().yields { statusCode: 404 }
				@TemplatesManager.createProjectFromV1Template = sinon.stub()
				@CollabratecManager.createProject "user-id", "template-id", "title", "doc-abstract", ["keyword-1", "keyword-2"], "author", "collabratec-document-id", "collabratec-privategroup-id", @callback

			it "should callback with NotFoundError", ->
				expect(@callback).to.have.been.calledOnce
				expect(@callback.firstCall.args[0]).to.be.instanceof @Errors.NotFoundError

			it "should not create project", ->
				expect(@TemplatesManager.createProjectFromV1Template).not.to.have.been.called

	describe "_injectProjectMetadata", ->

		describe "when get project succeeds", ->
			beforeEach ->
				@project =
					_id: "project-id"
					rootDoc_id: "root-doc-id"
				@ProjectGetter.getProject = sinon.stub().yields null, @project
				@ProjectEntityHandler.getDoc = sinon.stub()
				@CollabratecManager._injectProjectMetadata "user-id", { _id: "project-id" }, "title", "doc-abstract", ["keyword-1", "keyword-2"], @callback

			it "should get doc", ->
				expect(@ProjectEntityHandler.getDoc).to.have.been.calledOnce.and.calledWithMatch "project-id", "root-doc-id"

			describe "when get doc succeeds", ->
				beforeEach ->
					@newLines = [
						"\\documentclass{IEEEtran}",
						"\\begin{document}",
						"\\author{Test Author}",
						"\\title{title}",
						"\\begin{abstract}",
						"doc-abstract",
						"\\end{abstract}",
						"\\begin{IEEEkeywords}",
						"keyword-1, keyword-2",
						"\\end{IEEEkeywords}",
						"\\end{document}"
					]
					@ProjectEntityHandler.getDoc = sinon.stub().yields null, @lines, "revision"
					@DocumentUpdaterHandler.setDocument = sinon.stub().yields()
					@CollabratecManager._injectProjectMetadata "user-id", { _id: "project-id" }, "title", "doc-abstract", ["keyword-1", "keyword-2"], @callback

				it "should update doc lines", ->
					expect(@DocumentUpdaterHandler.setDocument).to.have.been.calledOnce.and.calledWith "project-id", "root-doc-id", "user-id", @newLines, "collabratec", @callback

			describe "when get doc returns error", ->
				beforeEach ->
					@ProjectEntityHandler.getDoc = sinon.stub().yields "error"
					@DocumentUpdaterHandler.setDocument = sinon.stub()
					@CollabratecManager._injectProjectMetadata "user-id", { _id: "project-id" }, "title", "doc-abstract", ["keyword-1", "keyword-2"], @callback

				it "should callback with error", ->
					expect(@callback).to.have.been.calledOnce.and.calledWith("error")

				it "should not update doc lines", ->
					expect(@DocumentUpdaterHandler.setDocument).not.to.have.been.called

		describe "when get project returns error", ->
			beforeEach ->
				@ProjectGetter.getProject = sinon.stub().yields "error"
				@ProjectEntityHandler.getDoc = sinon.stub()
				@CollabratecManager._injectProjectMetadata "user-id", { _id: "project-id" }, "title", "doc-abstract", ["keyword-1", "keyword-2"], @callback

			it "should callback with error", ->
				expect(@callback).to.have.been.calledOnce.and.calledWith("error")

			it "should not get doc", ->
				expect(@ProjectEntityHandler.getDoc).not.to.have.been.called
