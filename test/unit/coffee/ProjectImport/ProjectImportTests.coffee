should = require('chai').should()
SandboxedModule = require('sandboxed-module')
assert = require('assert')
path = require('path')
modulePath = path.join __dirname, '../../../../app/js/ProjectImport/ProjectImporter'
sinon = require("sinon")
expect = require("chai").expect

describe "ProjectImporter", ->
	beforeEach ->
		@ProjectImporter = SandboxedModule.require modulePath, requires:
			"../../../../../app/js/Features/Project/ProjectCreationHandler": @ProjectCreationHandler = {}
			"../../../../../app/js/Features/Project/ProjectEntityHandler": @ProjectEntityHandler = {}
			"../../../../../app/js/models/User": User: @User = {}
			"../OAuth/OAuthRequest": @oAuthRequest = sinon.stub()
			"request": @request = {}
			"logger-sharelatex": { log: sinon.stub() }
			"settings-sharelatex":
				overleaf:
					host: "http://overleaf.example.com"
					s3:
						host: "http://s3.example.com"
		@callback = sinon.stub()

	describe "importProject", ->
		beforeEach ->
			@ProjectImporter._getOverleafDoc = sinon.stub().yields(null, @doc = { files: ["mock-files"] })
			@ProjectImporter._initSlProject = sinon.stub().yields(null, @project = { _id: "mock-project-id" })
			@ProjectImporter._importFiles = sinon.stub().yields()
			@ProjectImporter.importProject(@ol_doc_id = "mock-ol-doc-id", @user_id = "mock-user-id", @callback)
	
		it "should get the doc from OL", ->
			@ProjectImporter._getOverleafDoc
				.calledWith(@ol_doc_id, @user_id)
				.should.equal true
		
		it "should create the SL project", ->
			@ProjectImporter._initSlProject
				.calledWith(@user_id, @doc)
				.should.equal true
		
		it "should import the files", ->
			@ProjectImporter._importFiles
				.calledWith(@project._id, @doc.files)
		
		it "should return the new project id", ->
			@callback.calledWith(null, @project._id).should.equal true
	
	describe "_initSlProject", ->
		beforeEach ->
			@project = {
				_id: "mock-project-id"
				overleaf: {}
				save: sinon.stub().yields()
			}
			@user_id = "mock-user-id"
			@doc = {
				title: "Test Doc"
				latex_engine: "latex_dvipdf"
				id: 42
				version: 1234
			}
			@ProjectCreationHandler.createBlankProject = sinon.stub().yields(null, @project)
			@ProjectImporter._initSlProject @user_id, @doc, @callback
		
		it "should create the project", ->
			@ProjectCreationHandler.createBlankProject
				.calledWith(@user_id, @doc.title)
				.should.equal true
		
		it "should set overleaf metadata on the project", ->
			@project.overleaf.id.should.equal @doc.id
			@project.overleaf.imported_at_version.should.equal @doc.version
		
		it "should set the appropriate project compiler from the latex_engine", ->
			@project.compiler.should.equal "latex"
		
		it "should save the project", ->
			@project.save.called.should.equal true
		
		it "should return the project", ->
			@callback.calledWith(null, @project).should.equal true
			
	describe "_getOverleafDoc", ->
		beforeEach ->
			@user = { "mock": "user" }
			@User.findOne = sinon.stub().yields(null, @user)
			@oAuthRequest.yields(null, @doc = { "mock": "doc" })
			@ProjectImporter._getOverleafDoc @ol_doc_id, @user_id, @callback
		
		it "should make an oauth request for the doc", ->
			@oAuthRequest
				.calledWith(@user, {
					url: "http://overleaf.example.com/api/v1/sharelatex/docs/#{@ol_doc_id}"
					method: "GET"
					json: true
				})
				.should.equal true
		
		it "should return the doc", ->
			@callback.calledWith(null, @doc).should.equal true
	
	describe "_importFile", ->
		beforeEach ->
			@project_id = "mock-project-id"
			@doc = { _id: @doc_id = "mock-doc-id" }
			@ProjectEntityHandler.mkdirp = sinon.stub().yields(null, [], { _id: @folder_id = "mock-folder-id" })
			@ProjectEntityHandler.addDoc = sinon.stub().yields(null, @doc)
			@ProjectEntityHandler.addFile = sinon.stub().yields()
			@ProjectEntityHandler.setRootDoc = sinon.stub().yields()
			
		describe "with a src file", ->
			beforeEach (done) ->
				@file = {
					file: "folder/chapter1.tex"
					latest_content: "chapter 1 content"
					type: "src"
				}
				@ProjectImporter._importFile @project_id, @file, done
			
			it "should create the file's folder", ->
				@ProjectEntityHandler.mkdirp
					.calledWith(@project_id, "/folder")
					.should.equal true
			
			it "should add the doc to the project", ->
				@ProjectEntityHandler.addDoc
					.calledWith(
						@project_id, @folder_id, "chapter1.tex", ["chapter 1 content"]
					)
					.should.equal true
			
			it "should not make the doc the root doc", ->
				@ProjectEntityHandler.setRootDoc
					.called.should.equal false

		describe "with the main src file", ->
			beforeEach (done) ->
				@file = {
					file: "main.tex"
					latest_content: "main content"
					type: "src"
					main: true
				}
				@ProjectImporter._importFile @project_id, @file, done
			
			it "should create the file's folder", ->
				@ProjectEntityHandler.mkdirp
					.calledWith(@project_id, "/")
					.should.equal true
			
			it "should make the doc the root doc", ->
				@ProjectEntityHandler.setRootDoc
					.calledWith(@project_id, @doc_id)
					.should.equal true
			
		describe "with an att file", ->
			beforeEach (done) ->
				@file = {
					file: "images/image.jpeg"
					file_path: "s3/image.jpeg"
					type: "att"
				}
				@ProjectImporter._writeUrlToDisk = sinon.stub().yields(null, "path/on/disk")
				@ProjectImporter._importFile @project_id, @file, done
			
			it "should create the file's folder", ->
				@ProjectEntityHandler.mkdirp
					.calledWith(@project_id, "/images")
					.should.equal true
			
			it "should download the url to disk", ->
				@ProjectImporter._writeUrlToDisk
					.calledWith("http://s3.example.com/s3/image.jpeg")
					.should.equal true
			
			it "should add the file to the project", ->
				@ProjectEntityHandler.addFile
					.calledWith(
						@project_id, @folder_id, "image.jpeg", "path/on/disk"
					)
					.should.equal true
