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
			"../../../../app/js/models/Project": Project: @Project = {}
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
			@owner_id = "owner-id-123"
			@name = "mock-name"
			@description = "Repository description"
			@Project.findById = sinon.stub().callsArgWith(2, null, @project = { owner_ref: @owner_id })
			@GithubSyncApiHandler.exportProject = sinon.stub().callsArg(4)
			@GithubSyncExportHandler._buildFileList = sinon.stub().callsArgWith(1, null, @files = ["mock-files"])
			@DocumentUpdaterHandler.flushProjectToMongo = sinon.stub().callsArg(1)
			@GithubSyncExportHandler.exportProject @project_id, { name: @name, description: @description }, @callback
			
		it "should look up the project owner", ->
			@Project.findById
				.calledWith(@project_id, {owner_ref: 1})
				.should.equal true
				
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
					@owner_id,
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
				},
				"/chapters/chapter1.tex": @doc_2 = {
					name: "chapter1.tex"
					_id: "mock-doc-id-2"
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
				}, {
					path:    "chapters/chapter1.tex"
					content: @doc_2.lines.join("\n")
				}, {
					path: "images/image.png"
					url:  "#{@settings.apis.filestore.url}/project/#{@project_id}/file/#{@file_1._id}"
				}])
				.should.equal true
