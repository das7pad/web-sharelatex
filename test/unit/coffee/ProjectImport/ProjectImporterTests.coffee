should = require('chai').should()
SandboxedModule = require('sandboxed-module')
assert = require('assert')
path = require('path')
modulePath = path.join __dirname, '../../../../app/js/ProjectImport/ProjectImporter'
sinon = require("sinon")
expect = require("chai").expect

PrivilegeLevels = require "../../../../../../app/js/Features/Authorization/PrivilegeLevels"
{UnsupportedFileType} = require "../../../../../../app/js/Features/Errors/Errors"

describe "ProjectImporter", ->
	beforeEach ->
		@ProjectImporter = SandboxedModule.require modulePath, requires:
			"../../../../../app/js/Features/Project/ProjectCreationHandler": @ProjectCreationHandler = {}
			"../../../../../app/js/Features/Project/ProjectEntityHandler": @ProjectEntityHandler = {}
			"../../../../../app/js/Features/Project/ProjectDeleter": @ProjectDeleter = {}
			"../../../../../app/js/models/ProjectInvite": ProjectInvite: @ProjectInvite = {}
			"../OAuth/OAuthRequest": @oAuthRequest = sinon.stub()
			"../OverleafUsers/UserMapper": @UserMapper = {}
			"../../../../../app/js/Features/Collaborators/CollaboratorsHandler": @CollaboratorsHandler = {}
			"../../../../../app/js/Features/Authorization/PrivilegeLevels": PrivilegeLevels
			"request": @request = {}
			"logger-sharelatex": { log: sinon.stub(), warn: sinon.stub() }
			"settings-sharelatex":
				overleaf:
					host: "http://overleaf.example.com"
					s3:
						host: "http://s3.example.com"
		@callback = sinon.stub()

	describe "importProject", ->
		beforeEach ->
			@ProjectImporter._getOverleafDoc = sinon.stub().yields(null, @doc = { files: ["mock-files"] })
			@ProjectImporter._initSharelatexProject = sinon.stub().yields(null, @project = { _id: "mock-project-id" })
			@ProjectImporter._importFiles = sinon.stub().yields()
			@ProjectImporter._flagOverleafDocAsImported = sinon.stub().yields()
			@ProjectImporter.importProject(@ol_doc_id = "mock-ol-doc-id", @user_id = "mock-user-id", @callback)
	
		it "should get the doc from OL", ->
			@ProjectImporter._getOverleafDoc
				.calledWith(@ol_doc_id, @user_id)
				.should.equal true
		
		it "should create the SL project", ->
			@ProjectImporter._initSharelatexProject
				.calledWith(@user_id, @doc)
				.should.equal true
		
		it "should import the files", ->
			@ProjectImporter._importFiles
				.calledWith(@project._id, @user_id, @doc.files)
				.should.equal true

		it "should tell overleaf the project is now in the beta", ->
			@ProjectImporter._flagOverleafDocAsImported
				.calledWith(@ol_doc_id, @project._id, @user_id)
				.should.equal true

		it "should return the new project id", ->
			@callback.calledWith(null, @project._id).should.equal true
	
	describe "_initSharelatexProject", ->
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
				latest_ver_id: 1234
				token: "token"
				read_token: "read_token"
				general_access: "read_write"
			}
			@ProjectCreationHandler.createBlankProject = sinon.stub().yields(null, @project)
		
		describe "successfully", ->
			beforeEach ->
				@ProjectImporter._initSharelatexProject @user_id, @doc, @callback
			
			it "should create the project", ->
				@ProjectCreationHandler.createBlankProject
					.calledWith(@user_id, @doc.title, @doc.id)
					.should.equal true
			
			it "should set overleaf metadata on the project", ->
				@project.overleaf.id.should.equal @doc.id
				@project.overleaf.imported_at_ver_id.should.equal @doc.latest_ver_id
				@project.tokens.readAndWrite.should.equal @doc.token
				@project.tokens.readOnly.should.equal @doc.read_token

			it "should set the appropriate project compiler from the latex_engine", ->
				@project.compiler.should.equal "latex"

			it 'should set the project to tokenBased', ->
				@project.publicAccesLevel.should.equal 'tokenBased'
			
			it "should save the project", ->
				@project.save.called.should.equal true
			
			it "should return the project", ->
				@callback.calledWith(null, @project).should.equal true
		
		describe "null checks", ->
			it "should require doc.title", (done) ->
				delete @doc.title
				@ProjectImporter._initSharelatexProject @user_id, @doc, (error) ->
					error.message.should.equal("expected doc title, id, latest_ver_id, latex_engine, token and read_token")
					done()

			it "should require doc.latest_ver_id", (done) ->
				delete @doc.latest_ver_id
				@ProjectImporter._initSharelatexProject @user_id, @doc, (error) ->
					error.message.should.equal("expected doc title, id, latest_ver_id, latex_engine, token and read_token")
					done()

			it "should require doc.id", (done) ->
				delete @doc.id
				@ProjectImporter._initSharelatexProject @user_id, @doc, (error) ->
					error.message.should.equal("expected doc title, id, latest_ver_id, latex_engine, token and read_token")
					done()

			it "should require doc.latex_engine", (done) ->
				delete @doc.latex_engine
				@ProjectImporter._initSharelatexProject @user_id, @doc, (error) ->
					error.message.should.equal("expected doc title, id, latest_ver_id, latex_engine, token and read_token")
					done()

			it "should require doc.token", (done) ->
				delete @doc.token
				@ProjectImporter._initSharelatexProject @user_id, @doc, (error) ->
					error.message.should.equal("expected doc title, id, latest_ver_id, latex_engine, token and read_token")
					done()

			it "should require doc.read_token", (done) ->
				delete @doc.read_token
				@ProjectImporter._initSharelatexProject @user_id, @doc, (error) ->
					error.message.should.equal("expected doc title, id, latest_ver_id, latex_engine, token and read_token")
					done()
		
		describe "with blank title", ->
			beforeEach ->
				@doc.title = ""
				@ProjectImporter._initSharelatexProject @user_id, @doc, @callback
			
			it "should set the title to 'Untitled'", ->
				@ProjectCreationHandler.createBlankProject
					.calledWith(@user_id, 'Untitled', @doc.id)
					.should.equal true
			
			
	describe "_getOverleafDoc", ->
		beforeEach ->
			@oAuthRequest.yields(null, @doc = { "mock": "doc" })
			@ProjectImporter._getOverleafDoc @ol_doc_id, @user_id, @callback
		
		it "should make an oauth request for the doc", ->
			@oAuthRequest
				.calledWith(@user_id, {
					url: "http://overleaf.example.com/api/v1/sharelatex/docs/#{@ol_doc_id}"
					method: "GET"
					json: true
				})
				.should.equal true
		
		it "should return the doc", ->
			@callback.calledWith(null, @doc).should.equal true

	describe "_importAcceptedInvite", ->
		beforeEach ->
			@project_id = "mock-project-id"
			@ol_invitee = {
				id: 42
				email: "joe@example.com"
			}
			@ol_inviter = {
				id: 54
				email: "jane@example.com"
			}
			@sl_invitee_id = "sl-invitee-id"
			@sl_inviter_id = "sl-inviter-id"
			@UserMapper.getSlIdFromOlUser = sinon.stub()
			@UserMapper.getSlIdFromOlUser.withArgs(@ol_invitee).yields(null, @sl_invitee_id)
			@UserMapper.getSlIdFromOlUser.withArgs(@ol_inviter).yields(null, @sl_inviter_id)
			@CollaboratorsHandler.addUserIdToProject = sinon.stub().yields()
			@invite = {
				inviter: @ol_inviter
				invitee: @ol_invitee
				email: "joe@example.com"
				token: "mock-token"
			}

		describe "with a read-only invite", ->
			beforeEach (done) ->
				@invite.access_level = "read_only"
				@ProjectImporter._importAcceptedInvite @project_id, @invite, done
			
			it "should look up the inviter in SL", ->
				@UserMapper.getSlIdFromOlUser
					.calledWith(@ol_inviter)
					.should.equal true
			
			it "should look up the invitee in SL", ->
				@UserMapper.getSlIdFromOlUser
					.calledWith(@ol_invitee)
					.should.equal true
			
			it "should add the SL invitee to project, with readOnly privilege level", ->
				@CollaboratorsHandler.addUserIdToProject
					.calledWith(@project_id, @sl_inviter_id, @sl_invitee_id, PrivilegeLevels.READ_ONLY)
					.should.equal true

		describe "with a read-write invite", ->
			beforeEach (done) ->
				@invite.access_level = "read_write"
				@ProjectImporter._importAcceptedInvite @project_id, @invite, done

			it "should add the SL invitee to project, with readAndWrite privilege level", ->
				@CollaboratorsHandler.addUserIdToProject
					.calledWith(@project_id, @sl_inviter_id, @sl_invitee_id, PrivilegeLevels.READ_AND_WRITE)
					.should.equal true
		
		describe "null checks", ->
			it "should require invite.inviter", (done) ->
				delete @invite.inviter
				@ProjectImporter._importAcceptedInvite @project_id, @invite, (error) ->
					error.message.should.equal("expected invite inviter, invitee and access_level")
					done()

			it "should require invite.invitee", (done) ->
				delete @invite.invitee
				@ProjectImporter._importAcceptedInvite @project_id, @invite, (error) ->
					error.message.should.equal("expected invite inviter, invitee and access_level")
					done()

			it "should require invite.access_level", (done) ->
				delete @invite.access_level
				@ProjectImporter._importAcceptedInvite @project_id, @invite, (error) ->
					error.message.should.equal("expected invite inviter, invitee and access_level")
					done()

	describe "_importPendingInvite", ->
		beforeEach ->
			@project_id = "mock-project-id"
			@ol_inviter = {
				id: 54
				email: "jane@example.com"
			}
			@sl_inviter_id = "sl-inviter-id"
			@UserMapper.getSlIdFromOlUser = sinon.stub()
			@UserMapper.getSlIdFromOlUser.withArgs(@ol_inviter).yields(null, @sl_inviter_id)
			@ProjectInvite.create = sinon.stub().yields()
			@invite = {
				inviter: @ol_inviter
				email: "joe@example.com"
				token: "mock-token"
				code: "mock-code"
			}

		describe "with a read-only invite", ->
			beforeEach (done) ->
				@invite.access_level = "read_only"
				@ProjectImporter._importPendingInvite @project_id, @invite, done
			
			it "should look up the inviter in SL", ->
				@UserMapper.getSlIdFromOlUser
					.calledWith(@ol_inviter)
					.should.equal true
			
			it "should create a ProjectInvite, with readOnly privilege level", ->
				@ProjectInvite.create
					.calledWith({
						projectId: @project_id,
						token: @invite.code,
						sendingUserId: @sl_inviter_id, 
						privileges: PrivilegeLevels.READ_ONLY,
						email: @invite.email
					})
					.should.equal true

		describe "with a read-write invite", ->
			beforeEach (done) ->
				@invite.access_level = "read_write"
				@ProjectImporter._importPendingInvite @project_id, @invite, done
		
			it "should create a ProjectInvite, with readAndWrite privilege level", ->
				@ProjectInvite.create
					.calledWith({
						projectId: @project_id,
						token: @invite.code,
						sendingUserId: @sl_inviter_id, 
						privileges: PrivilegeLevels.READ_AND_WRITE,
						email: @invite.email
					})
					.should.equal true
		
		describe "null checks", ->
			it "should require invite.inviter", (done) ->
				delete @invite.inviter
				@ProjectImporter._importPendingInvite @project_id, @invite, (error) ->
					error.message.should.equal("expected invite inviter, code, email and access_level")
					done()

			it "should require invite.code", (done) ->
				delete @invite.code
				@ProjectImporter._importPendingInvite @project_id, @invite, (error) ->
					error.message.should.equal("expected invite inviter, code, email and access_level")
					done()

			it "should require invite.email", (done) ->
				delete @invite.email
				@ProjectImporter._importPendingInvite @project_id, @invite, (error) ->
					error.message.should.equal("expected invite inviter, code, email and access_level")
					done()

			it "should require invite.access_level", (done) ->
				delete @invite.access_level
				@ProjectImporter._importPendingInvite @project_id, @invite, (error) ->
					error.message.should.equal("expected invite inviter, code, email and access_level")
					done()

	describe "_importFile", ->
		beforeEach ->
			@project_id = "mock-project-id"
			@user_id = "mock-user-id"
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
				@ProjectImporter._importFile @project_id, @user_id, @file, done
			
			it "should create the file's folder", ->
				@ProjectEntityHandler.mkdirp
					.calledWith(@project_id, "/folder")
					.should.equal true
			
			it "should add the doc to the project", ->
				@ProjectEntityHandler.addDoc
					.calledWith(
						@project_id, @folder_id, "chapter1.tex", ["chapter 1 content"], @user_id
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
				@ProjectImporter._importFile @project_id, @user_id, @file, done
			
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
				@ProjectImporter._importFile @project_id, @user_id, @file, done
			
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
						@project_id, @folder_id, "image.jpeg", "path/on/disk", @user_id
					)
					.should.equal true

		describe "with an unknown file type", ->
			beforeEach ->
				@file = {
					file: 'linked_file.pdf'
					file_path: 's3/linked_file.pdf'
					type: 'ext'
				}
				@ProjectImporter._importFile @project_id, @user_id, @file, @callback

			it 'should throw an error', ->
				@callback
					.calledWith(new UnsupportedFileType("unknown file type: ext"))
					.should.equal true

		describe "null checks", ->
			beforeEach ->
				@att_file = {
					file: "images/image.jpeg"
					file_path: "s3/image.jpeg"
					type: "att"
				}
				@src_file = {
					file: "folder/chapter1.tex"
					latest_content: "chapter 1 content"
					type: "src"
				}
				
			it "should require file.file", (done) ->
				delete @src_file.file
				@ProjectImporter._importFile @project_id, @user_id, @src_file, (error) ->
					error.message.should.equal("expected file.file and type")
					done()
				
			it "should require file.type", (done) ->
				delete @src_file.type
				@ProjectImporter._importFile @project_id, @user_id, @src_file, (error) ->
					error.message.should.equal("expected file.file and type")
					done()
				
			it "should require file.latest_content", (done) ->
				delete @src_file.latest_content
				@ProjectImporter._importFile @project_id, @user_id, @src_file, (error) ->
					error.message.should.equal("expected file.latest_content")
					done()
				
			it "should require file.file_path", (done) ->
				delete @att_file.file_path
				@ProjectImporter._importFile @project_id, @user_id, @att_file, (error) ->
					error.message.should.equal("expected file.file_path")
					done()
			
	describe "_flagOverleafDocAsImported", ->
		beforeEach ->
			@oAuthRequest.yields()
			@ol_doc_id = "mock-ol-doc-id"
			@sl_project_id = "mock-project-id"
			@user_id = "mock-user-id"
			@ProjectImporter._flagOverleafDocAsImported @ol_doc_id, @sl_project_id, @user_id, @callback
		
		it "should make an oauth request for the doc", ->
			@oAuthRequest
				.calledWith(@user_id, {
					url: "http://overleaf.example.com/api/v1/sharelatex/docs/#{@ol_doc_id}"
					method: "PUT"
					json: {
						doc: {
							beta_project_id: @sl_project_id
						}
					}
				})
				.should.equal true
		
		it "should return the callback", ->
			@callback.called.should.equal true

	describe 'error handling', ->
		beforeEach ->
			@ProjectImporter._getOverleafDoc = sinon.stub().yields(null, @doc = { files: ["mock-files"] })
			@ProjectImporter._initSharelatexProject = sinon.stub().yields(null, @project = { _id: "mock-project-id" })
			@ProjectDeleter.deleteProject = sinon.stub().yields()
			# Mock import file error
			@error = new UnsupportedFileType("unknown file type: ext")
			@ProjectImporter._importFiles = sinon.stub().yields(@error)
			@ProjectImporter.importProject(@ol_doc_id = "mock-ol-doc-id", @user_id = "mock-user-id", @callback)

		it 'should delete the newly created project', ->
			@ProjectDeleter.deleteProject.calledWith(@project_id)

		it 'should callback with the error', ->
			@callback.calledWith(@error)
