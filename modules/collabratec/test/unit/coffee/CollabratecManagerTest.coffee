ObjectId = require("mongojs").ObjectId
Path = require "path"
SandboxedModule = require "sandboxed-module"
assert = require "assert"
chai = require "chai"
modulePath = Path.join __dirname, "../../../app/js/CollabratecManager"
sinon = require "sinon"
sinonChai = require "sinon-chai"

chai.use sinonChai
expect = chai.expect

describe "CollabratecManager", ->
	beforeEach ->
		@CollabratecManager = SandboxedModule.require modulePath, requires:
			"../../../../app/js/Features/DocumentUpdater/DocumentUpdaterHandler":
				@DocumentUpdaterHandler = {}
			"../../../../app/js/Features/Project/ProjectEntityHandler": @ProjectEntityHandler = {}
			"../../../../app/js/Features/Project/ProjectGetter": @ProjectGetter = {}
			"../../../../app/js/Features/Project/ProjectRootDocManager":
				@ProjectRootDocManager = {}
			"logger-sharelatex": { log: sinon.stub(), err: sinon.stub() }

	describe "getProjectMetadata", ->
		beforeEach ->
			@user =
				_id: "user-id"
			@callback = sinon.stub()
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
						@ProjectEntityHandler.getDoc = sinon.stub().yields null, @lines

					it "should callback with project metadata", ->
						@CollabratecManager.getProjectMetadata @user, "project-id", @callback
						expect(@callback).to.have.been.calledWith null, {
							title: "project-title",
							doc_abstract: "Test abstract. It spans two lines.",
							primary_author: "Test Author",
							keywords: [ "keyword one", "keyword two" ],
							created_at: 1540993059000,
							updated_at: 1541066400000,
							url: "http://localhost:3000/project/5bd9b0232688a3011fd7cb4c"
						}

				describe "when error occurs with getDoc", ->
					beforeEach ->
						@ProjectEntityHandler.getDoc = sinon.stub().yields "error"

					it "should callback with error", ->
						@CollabratecManager.getProjectMetadata @user, "project-id", @callback
						expect(@callback).to.have.been.calledWith "error"

			describe "when project does not have rootDoc_id", ->
				beforeEach ->
					@project =
						_id: ObjectId("5bd9b0232688a3011fd7cb4c")
						lastUpdated: "2018-11-01 10:00:00Z"
						name: "project-title"
					@ProjectGetter.getProject = sinon.stub().yields null, @project

				it "should callback with limited metadata", ->
					@CollabratecManager.getProjectMetadata @user, "project-id", @callback
					expect(@callback).to.have.been.calledWith null, {
						title: "project-title",
						created_at: 1540993059000,
						updated_at: 1541066400000,
						url: "http://localhost:3000/project/5bd9b0232688a3011fd7cb4c"
					}

		describe "when project id is not found", ->
			beforeEach ->
				@ProjectGetter.getProject = sinon.stub().yields "error"

			it "should callback with error", ->
				@CollabratecManager.getProjectMetadata @user, "project-id", @callback
				expect(@callback).to.have.been.calledWith "error"
