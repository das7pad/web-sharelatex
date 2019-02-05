sinon = require('sinon')
chai = require('chai')
should = chai.should()
expect = chai.expect
modulePath = require('path').join __dirname, '../../../app/js/GithubSyncExportHandler.js'
SandboxedModule = require('sandboxed-module')

describe "GithubSyncExportHandler", ->
	beforeEach ->
		@GithubSyncExportHandler = SandboxedModule.require modulePath, requires:
			"../../../../app/js/Features/Project/ProjectEntityHandler": @ProjectEntityHandler = {}
			"../../../../app/js/Features/DocumentUpdater/DocumentUpdaterHandler": @DocumentUpdaterHandler = {}
			"../../../../app/js/Features/Project/ProjectGetter": @ProjectGetter = {}
			"./GithubSyncApiHandler": @GithubSyncApiHandler = {}
			"settings-sharelatex": @settings =
				apis:
					filestore:
						url: "filestore.example.com"
					githubSync:
						url: "github-sync.example.com"
			
		@project_id = "project-id"
		@callback = sinon.stub()
		
	describe "exportProject", ->
		beforeEach ->
			@user_id = "user-id-123"
			@name = "mock-name"
			@description = "Repository description"
			@GithubSyncApiHandler.exportProject = sinon.stub().callsArg(4)
			@GithubSyncExportHandler._buildFileList = sinon.stub().callsArgWith(1, null, @files = ["mock-files"])
			@DocumentUpdaterHandler.flushProjectToMongo = sinon.stub().callsArg(1)
			@GithubSyncExportHandler.exportProject @project_id, @user_id, { name: @name, description: @description }, @callback
			
		it "should flush the document to Mongo", ->
			@DocumentUpdaterHandler.flushProjectToMongo
				.calledWith(@project_id)
				.should.equal true
				
		it "should get the project file list", ->
			@GithubSyncExportHandler._buildFileList
				.calledWith(@project_id)
				.should.equal true
				
		it "should send an export request to the Github API", ->
			@GithubSyncApiHandler.exportProject
				.calledWith(
					@project_id,
					@user_id,
					{ name: @name, description: @description }, 
					@files
				)
				.should.equal true
				
	describe "mergeProject", ->
		beforeEach ->
			@owner_id = "owner-id-123"
			@message = "Commit message"
			@GithubSyncApiHandler.mergeProject = sinon.stub().callsArg(3)
			@GithubSyncExportHandler._buildFileList = sinon.stub().callsArgWith(1, null, @files = ["mock-files"])
			@DocumentUpdaterHandler.flushProjectToMongo = sinon.stub().callsArg(1)
			@GithubSyncExportHandler.mergeProject @project_id, { message: @message }, @callback

		it "should flush the document to Mongo", ->
			@DocumentUpdaterHandler.flushProjectToMongo
				.calledWith(@project_id)
				.should.equal true
				
		it "should get the project file list", ->
			@GithubSyncExportHandler._buildFileList
				.calledWith(@project_id)
				.should.equal true
				
		it "should send a merge request to the Github API", ->
			@GithubSyncApiHandler.mergeProject
				.calledWith(
					@project_id,
					{ message: @message }, 
					@files
				)
				.should.equal true
				
	describe "_buildFileList", ->
		beforeEach ->
			@docs = {
				"/main.tex": @doc_1 = {
					name: "main.tex"
					_id: "mock-doc-id-1"
					lines: ["Hello", "world"]
					rev: 42
				},
				"/chapters/chapter1.tex": @doc_2 = {
					name: "chapter1.tex"
					_id: "mock-doc-id-2"
					rev: 24
					lines: [
						"Chapter 1"
					]
				}
			}

			@files = {
				"/images/image.png": @file_1 = {
					name: "image.png"
					_id:  "mock-file-id-1"
					created: new Date()
					rev: 0
				}
			}

			@ProjectEntityHandler.getAllDocs = sinon.stub().callsArgWith(1, null, @docs)
			@ProjectEntityHandler.getAllFiles = sinon.stub().callsArgWith(1, null, @files)
			
			@GithubSyncExportHandler._buildFileList @project_id, @callback

		it "should return the list of files", ->
			@callback
				.calledWith(null, [{
					path:    "main.tex"
					content: @doc_1.lines.join("\n")
					id:      "mock-doc-id-1"
					rev:     42
				}, {
					path:    "chapters/chapter1.tex"
					content: @doc_2.lines.join("\n")
					id:      "mock-doc-id-2"
					rev:     24
				}, {
					path: "images/image.png"
					url:  "#{@settings.apis.filestore.url}/project/#{@project_id}/file/#{@file_1._id}"
					id:   "mock-file-id-1"
					rev:  0
				}])
				.should.equal true
