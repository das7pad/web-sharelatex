should = require('chai').should()
SandboxedModule = require('sandboxed-module')
assert = require('assert')
path = require('path')
modulePath = path.join __dirname, '../../../../app/js/ProjectImport/ProjectImporter'
sinon = require("sinon")
expect = require("chai").expect

PrivilegeLevels = require "../../../../../../app/js/Features/Authorization/PrivilegeLevels"
{UnsupportedFileTypeError} = require "../../../../../../app/js/Features/Errors/Errors"

describe "ProjectImporter", ->
	beforeEach ->
		@ProjectImporter = SandboxedModule.require modulePath, requires:
			"../../../../../app/js/Features/Project/ProjectCreationHandler": @ProjectCreationHandler = {}
			"../../../../../app/js/Features/Project/ProjectEntityUpdateHandler": @ProjectEntityUpdateHandler = {}
			"../../../../../app/js/Features/Project/ProjectDeleter": @ProjectDeleter = {}
			"../../../../../app/js/models/ProjectInvite": ProjectInvite: @ProjectInvite = {}
			"../OAuth/OAuthRequest": @oAuthRequest = sinon.stub()
			"../OverleafUsers/UserMapper": @UserMapper = {}
			"../../../../../app/js/Features/Collaborators/CollaboratorsHandler": @CollaboratorsHandler = {}
			"../../../../../app/js/Features/Authorization/PrivilegeLevels": PrivilegeLevels
			"request": @request = {}
			"logger-sharelatex": { log: sinon.stub(), warn: sinon.stub(), err: sinon.stub() }
			"metrics-sharelatex": { inc: sinon.stub() }
			"settings-sharelatex": @settings =
				overleaf:
					host: "http://overleaf.example.com"
					s3:
						host: "http://s3.example.com"
		@callback = sinon.stub()

	describe "importProject", ->
		beforeEach ->
			@ProjectImporter._startExport = sinon.stub().yields(null, @doc = { files: ["mock-files"] })
			@ProjectImporter._initSharelatexProject = sinon.stub().yields(null, @project_id = "mock-project-id")
			@ProjectImporter._importFiles = sinon.stub().yields()
			@ProjectImporter._waitForV1HistoryExport = sinon.stub().yields()
			@ProjectImporter._confirmExport = sinon.stub().yields()
			@ProjectImporter._cancelExport = sinon.stub().yields()

		describe "successfully", ->
			beforeEach (done) ->
				@ProjectImporter.importProject @v1_project_id = "mock-ol-doc-id", @user_id = "mock-user-id", (error, project_id) =>
					@callback(error, project_id)
					done(error, project_id)

			it "should get the doc from OL", ->
				@ProjectImporter._startExport
					.calledWith(@v1_project_id, @user_id)
					.should.equal true

			it "should create the SL project", ->
				@ProjectImporter._initSharelatexProject
					.calledWith(@user_id, @doc)
					.should.equal true

			it "should import the files", ->
				@ProjectImporter._importFiles
					.calledWith(@project_id, @user_id, @doc.files)
					.should.equal true

			it "should tell overleaf the project is now in the beta", ->
				@ProjectImporter._confirmExport
					.calledWith(@v1_project_id, @project_id, @user_id)
					.should.equal true

			it "should return the new project id", ->
				@callback.calledWith(null, @project_id).should.equal true

		describe 'unsuccessfully', ->
			beforeEach (done) ->
				# Mock import file error
				@error = new UnsupportedFileTypeError("unknown file type: ext")
				@ProjectImporter._importFiles = sinon.stub().yields(@error)
				@ProjectDeleter.deleteProject = sinon.stub().yields()
				@ProjectImporter.importProject @v1_project_id = "mock-ol-doc-id", @user_id = "mock-user-id", (error) =>
					@callback(error)
					done()

			it 'should delete the newly created project', ->
				@ProjectDeleter.deleteProject.calledWith(@project_id)
					.should.equal true

			it 'should cancel the import', ->
				@ProjectImporter._cancelExport.calledWith(@v1_project_id)
					.should.equal true

			it 'should callback with the error', ->
				@callback.calledWith(@error)

	describe "_initSharelatexProject", ->
		beforeEach ->
			@project = {
				_id: "mock-project-id"
				overleaf: {
					history: {}
				}
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
				template_id: '10'
				template_ver_id: '2'
			}
			@ProjectCreationHandler.createBlankProject = sinon.stub().yields(null, @project)

		describe "successfully", ->
			beforeEach ->
				@ProjectImporter._initSharelatexProject @user_id, @doc, @callback

			it "should create the project", ->
				attributes =
					overleaf:
						id: @doc.id
						imported_at_ver_id: @doc.latest_ver_id
						history:
							id: @doc.id
							display: true
					tokens:
						readOnly: @doc.read_token
						readAndWrite: @doc.token
					fromV1TemplateId: @doc.template_id
					fromV1TemplateVersionId: @doc.template_ver_id
					publicAccesLevel: 'tokenBased'
					compiler: "latex"

				console.log 'expected', [@user_id, @doc.title, attributes]
				console.log 'actual', @ProjectCreationHandler.createBlankProject.args[0].slice(0,-1)
				@ProjectCreationHandler.createBlankProject
					.calledWith(@user_id, @doc.title, attributes)
					.should.equal true

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

		describe "with brand variation", ->
			it "should allow projects from the overleaf brand variation to be imported", (done) ->
				@doc.brand_variation_id = 52
				@ProjectImporter._initSharelatexProject @user_id, @doc, (error, project_id) ->
					expect(error).to.equal(null)
					expect(project_id).to.not.be.undefined
					done()

			it "should prevent import", (done) ->
				@doc.brand_variation_id = 123
				@ProjectImporter._initSharelatexProject @user_id, @doc, (error) ->
					error.message.should.equal("project has brand variation: 123")
					done()

		describe "with export records", ->
			it "should prevent import", (done) ->
				@doc.has_export_records = true
				@ProjectImporter._initSharelatexProject @user_id, @doc, (error) ->
					error.message.should.equal("project has export records")
					done()

		describe "with blank title", ->
			beforeEach ->
				@doc.title = ""
				@ProjectImporter._initSharelatexProject @user_id, @doc, @callback

			it "should set the title to 'Untitled'", ->
				@ProjectCreationHandler.createBlankProject
					.calledWith(@user_id, 'Untitled')
					.should.equal true

	describe "_startExport", ->
		beforeEach ->
			@oAuthRequest.yields(null, @doc = { "mock": "doc" })
			@ProjectImporter._startExport @v1_project_id, @user_id, @callback

		it "should make an oauth request for the doc", ->
			@oAuthRequest
				.calledWith(@user_id, {
					url: "http://overleaf.example.com/api/v1/sharelatex/docs/#{@v1_project_id}/export/start"
					method: "POST"
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
			@ProjectEntityUpdateHandler.mkdirp = sinon.stub().yields(null, [], { _id: @folder_id = "mock-folder-id" })
			@ProjectEntityUpdateHandler.addDocWithoutUpdatingHistory = sinon.stub().yields(null, @doc)
			@ProjectEntityUpdateHandler.addFileWithoutUpdatingHistory = sinon.stub().yields()
			@ProjectEntityUpdateHandler.setRootDoc = sinon.stub().yields()

		describe "with a src file", ->
			beforeEach (done) ->
				@file = {
					file: "folder/chapter1.tex"
					latest_content: "chapter 1 content"
					type: "src"
				}
				@ProjectImporter._importFile @project_id, @user_id, @file, done

			it "should create the file's folder", ->
				@ProjectEntityUpdateHandler.mkdirp
					.calledWith(@project_id, "/folder")
					.should.equal true

			it "should add the doc to the project", ->
				@ProjectEntityUpdateHandler.addDocWithoutUpdatingHistory
					.calledWith(
						@project_id, @folder_id, "chapter1.tex", ["chapter 1 content"], @user_id
					)
					.should.equal true

			it "should not make the doc the root doc", ->
				@ProjectEntityUpdateHandler.setRootDoc
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
				@ProjectEntityUpdateHandler.mkdirp
					.calledWith(@project_id, "/")
					.should.equal true

			it "should make the doc the root doc", ->
				@ProjectEntityUpdateHandler.setRootDoc
					.calledWith(@project_id, @doc_id)
					.should.equal true

		describe "with an att file", ->
			beforeEach (done) ->
				@file = {
					file: "images/image.jpeg"
					file_path: "s3/image.jpeg"
					type: "att"
				}
				@ProjectImporter._writeS3ObjectToDisk = sinon.stub().yields(null, "path/on/disk")
				@ProjectImporter._importFile @project_id, @user_id, @file, done

			it "should create the file's folder", ->
				@ProjectEntityUpdateHandler.mkdirp
					.calledWith(@project_id, "/images")
					.should.equal true

			it "should download the url to disk from s3", ->
				@ProjectImporter._writeS3ObjectToDisk
					.calledWith("s3/image.jpeg")
					.should.equal true

			it "should add the file to the project", ->
				@ProjectEntityUpdateHandler.addFileWithoutUpdatingHistory
					.calledWith(
						@project_id, @folder_id, "image.jpeg", "path/on/disk", null, @user_id
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
					.calledWith(new UnsupportedFileTypeError("unknown file type: ext"))
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

	describe "_confirmExport", ->
		beforeEach ->
			@oAuthRequest.yields()
			@v1_project_id = "mock-ol-doc-id"
			@v2_project_id = "mock-project-id"
			@user_id = "mock-user-id"
			@ProjectImporter._confirmExport @v1_project_id, @v2_project_id, @user_id, @callback

		it "should make an oauth request for the doc", ->
			@oAuthRequest
				.calledWith(@user_id, {
					url: "http://overleaf.example.com/api/v1/sharelatex/docs/#{@v1_project_id}/export/confirm"
					method: "POST"
					json: {
						doc: { @v2_project_id }
					}
				})
				.should.equal true

		it "should return the callback", ->
			@callback.called.should.equal true

	describe "_cancelExport", ->
		beforeEach ->
			@oAuthRequest.yields()
			@v1_project_id = "mock-ol-doc-id"
			@v2_project_id = "mock-project-id"
			@user_id = "mock-user-id"
			@ProjectImporter._cancelExport @v1_project_id, @user_id, @callback

		it "should make an oauth request for the doc", ->
			@oAuthRequest
				.calledWith(@user_id, {
					url: "http://overleaf.example.com/api/v1/sharelatex/docs/#{@v1_project_id}/export/cancel"
					method: "POST"
				})
				.should.equal true

		it "should return the callback", ->
			@callback.called.should.equal true

	describe "_writeS3ObjectToDisk", ->
		beforeEach ->
			@ProjectImporter._writeUrlToDisk = sinon.stub().yields()

		it "should URI encode the file path", (done) ->
			@ProjectImporter._writeS3ObjectToDisk "foo/b a r", (error) =>
				@ProjectImporter._writeUrlToDisk
					.calledWithMatch({
						url: "http://s3.example.com/foo/b%20a%20r"
					})
					.should.equal true
				done()

		it "should call _writeUrlToDisk with the s3 url", (done) ->
			@ProjectImporter._writeS3ObjectToDisk "foo/bar", (error) =>
				@ProjectImporter._writeUrlToDisk
					.calledWithMatch({
						url: "http://s3.example.com/foo/bar"
					})
					.should.equal true
				done()

		it "should call _writeUrlToDisk with the s3 credentials if present", (done) ->
			@settings.overleaf.s3.key = "mock-key"
			@settings.overleaf.s3.secret = "mock-secret"
			@ProjectImporter._writeS3ObjectToDisk "foo/bar", (error) =>
				@ProjectImporter._writeUrlToDisk
					.calledWith({
						url: "http://s3.example.com/foo/bar"
						aws:
							key: "mock-key"
							secret: "mock-secret"
					})
					.should.equal true
				done()
