sinon = require('sinon')
chai = require('chai')
should = chai.should()
expect = chai.expect
modulePath = require('path').join __dirname, '../../../app/js/GithubSyncImportHandler.js'
SandboxedModule = require('sandboxed-module')

describe "GithubSyncImportHandler", ->
	beforeEach ->
		@GithubSyncImportHandler = SandboxedModule.require modulePath, requires:
			"../../../../app/js/Features/Project/ProjectCreationHandler": @ProjectCreationHandler = {}
			"../../../../app/js/Features/Project/ProjectRootDocManager": @ProjectRootDocManager = {}
			"./GithubSyncApiHandler": @GithubSyncApiHandler = {}			
		@callback = sinon.stub()
		
	describe "importProject", ->
		beforeEach ->
			@owner_id = "owner-id-123"
			@name = "project-name"
			@repo = "org/repo"
			@project = 
				_id: @project_id = "project-id-123"
			@ProjectCreationHandler.createBlankProject = sinon.stub().callsArgWith(2, null, @project)
			@GithubSyncApiHandler.importProject = sinon.stub().callsArg(3)
			@ProjectRootDocManager.setRootDocAutomatically = sinon.stub().callsArg(1)
			@GithubSyncImportHandler.importProject @owner_id, @name, @repo, @callback
			
		it "should create a project", ->
			@ProjectCreationHandler.createBlankProject
				.calledWith(@owner_id, @name)
				.should.equal true
				
		it "should import the project from github", ->
			@GithubSyncApiHandler.importProject
				.calledWith(@project_id, @owner_id, @repo)
				.should.equal true
				
		it "should set the root doc", ->
			@ProjectRootDocManager.setRootDocAutomatically
				.calledWith(@project_id)
				.should.equal true
				
		it "should call the callback with the project id", ->
			@callback.calledWith(null, @project_id).should.equal true
