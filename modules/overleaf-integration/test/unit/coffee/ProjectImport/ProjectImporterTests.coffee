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
			"../../../../../app/js/Features/Project/ProjectDetailsHandler": @ProjectDetailsHandler = {}
			"../../../../../app/js/Features/Project/ProjectEntityUpdateHandler": @ProjectEntityUpdateHandler = {}
			"../../../../../app/js/Features/Project/ProjectDeleter": @ProjectDeleter = {}
			"../../../../../app/js/models/ProjectInvite": ProjectInvite: @ProjectInvite = {}
			"../../../../../app/js/Features/Collaborators/CollaboratorsHandler": @CollaboratorsHandler = {}
			"../../../../../app/js/Features/TokenAccess/TokenAccessHandler": @TokenAccessHandler = {}
			"../../../../../app/js/Features/Authorization/PrivilegeLevels": PrivilegeLevels
			"../../../../../app/js/Features/User/UserGetter": @UserGetter = {}
			"../../../../../app/js/Features/Tags/TagsHandler": @TagsHandler =
				addProjectToTagName: sinon.stub().yields()
			"../V1SharelatexApi": @V1SharelatexApi = {}
			"../OverleafUsers/UserMapper": @UserMapper = {}
			"logger-sharelatex": { log: sinon.stub(), warn: sinon.stub(), err: sinon.stub() }
			"metrics-sharelatex": { inc: sinon.stub() }
			"request": @request = {}
			"settings-sharelatex": @settings =
				overleaf:
					host: "http://overleaf.example.com"
					s3:
						host: "http://s3.example.com"
				apis:
					v1:
						url: "http://overleaf.example.com"
		@v1_user_id = 'mock-v1-id'
		@v2_user_id = 'mock-v2-id'
		@v1_project_id = "mock-v1-doc-id"
		@v2_project_id = "mock-v2-project-id"
		@callback = sinon.stub()

	describe "importProject", ->
		beforeEach ->
			@UserGetter.getUser = sinon.stub().yields(null, @user = {
				_id: @v2_user_id,
				overleaf: {
					id: @v1_user_id
				}
			})
			@ProjectImporter._startExport = sinon.stub().yields(null, @doc = {
				id: @v1_project_id,
				owner_id: @v1_user_id,
				files: ["mock-files"],
				tags: ["foo", "bar"],
				invites: [{
					id: 1,
					email: "invite1@example.com",
					name: "invite 1"
				}],
				token_access_invites: []
			})
			@ProjectImporter._initSharelatexProject = sinon.stub().yields(null, @v2_project_id)
			@ProjectImporter._importInvites = sinon.stub().yields()
			@ProjectImporter._importTokenAccessInvites = sinon.stub().yields()
			@ProjectImporter._importFiles = sinon.stub().yields()
			@ProjectImporter._importLabels = sinon.stub().yields()
			@ProjectImporter._waitForV1HistoryExport = sinon.stub().yields()
			@ProjectImporter._confirmExport = sinon.stub().yields()
			@ProjectImporter._cancelExport = sinon.stub().yields()
			@ProjectImporter._importTags = sinon.stub().yields()

		describe "successfully", ->
			beforeEach (done) ->
				@ProjectImporter.importProject @v1_project_id, @v2_user_id, (error, project_id) =>
					@callback(error, project_id)
					done(error, project_id)

			it "should get the user", ->
				@UserGetter.getUser
					.calledWith(@v2_user_id)
					.should.equal true

			it "should get the doc from OL", ->
				@ProjectImporter._startExport
					.calledWith(@v1_project_id, @v1_user_id)
					.should.equal true

			it "should create the SL project", ->
				@ProjectImporter._initSharelatexProject
					.calledWith(@v2_user_id, @v2_user_id, @doc)
					.should.equal true

			it "should import the invites", ->
				@ProjectImporter._importInvites
					.calledWith(@v1_project_id, @v2_project_id, @doc.invites)
					.should.equal true

			it "should import the token-access invites", ->
				@ProjectImporter._importTokenAccessInvites
					.calledWith(@v2_project_id, @doc.token_access_invites)

			it "should import the files", ->
				@ProjectImporter._importFiles
					.calledWith(@v2_project_id, @v2_user_id, @doc.files)
					.should.equal true

			it "should import the labels", ->
				@ProjectImporter._importLabels
					.calledWith(@v1_project_id, @v2_project_id, @v1_user_id)
					.should.equal true

			it "should import the owner's tags", ->
				@ProjectImporter._importTags
					.calledWith(@v1_project_id, @v2_project_id, @v1_user_id, @v2_user_id)
					.should.equal true

			it "should tell overleaf the project is now in the beta", ->
				@ProjectImporter._confirmExport
					.calledWith(@v1_project_id, @v2_project_id, @v1_user_id)
					.should.equal true

			it "should return the new project id", ->
				@callback.calledWith(null, @v2_project_id).should.equal true

		describe 'unsuccessfully', ->
			beforeEach (done) ->
				# Mock import file error
				@error = new UnsupportedFileTypeError("unknown file type: ext")
				@ProjectImporter._importFiles = sinon.stub().yields(@error)
				@ProjectDeleter.deleteProject = sinon.stub().yields()
				@ProjectImporter.importProject @v1_project_id, @v2_user_id, (error) =>
					@callback(error)
					done()

			it 'should delete the newly created project', ->
				@ProjectDeleter.deleteProject.calledWith(@v2_project_id)
					.should.equal true

			it 'should cancel the import', ->
				@ProjectImporter._cancelExport.calledWith(@v1_project_id)
					.should.equal true

			it 'should callback with the error', ->
				@callback.calledWith(@error)

	describe "_checkOwnerIsMigrated", ->
		describe "successfully", ->
			beforeEach ->
				@owner_id = 'mock-v1-id'
				@doc = { owner_id: @owner_id }
				@UserGetter.getUser = sinon.stub().yields(null, @user = {
					_id: @v2_user_id,
					overleaf: {
						id: @owner_id
					}
				})
				@ProjectImporter._checkOwnerIsMigrated @doc, @callback

			it "should callback with the v2 user id", ->
				@callback.calledWith(null, @v2_user_id).should.equal true

		describe "unsuccessfully", ->
			beforeEach ->
				@error = new Error('something went wrong')
				@UserGetter.getUser = sinon.stub().yields(@error)
				@ProjectImporter._checkOwnerIsMigrated {}, @callback

			it "should callback with the error", ->
				@callback.calledWith(@error).should.equal true

		describe "with no matching v2 user", ->
			beforeEach ->
				@owner_id = 'mock-v1-id'
				@doc = { owner_id: @owner_id }
				@UserGetter.getUser = sinon.stub().yields(null, null)

			it "should callback with an error", (done) ->
				@ProjectImporter._checkOwnerIsMigrated @doc, (error) =>
					expect(error.message).to.equal("failed to import because owner is not migrated to v2")
					done()

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
			@ProjectDetailsHandler.fixProjectName = sinon.stub().returns('fixed-project-name')
			@ProjectDetailsHandler.generateUniqueName = (user_id, name, suffixes, callback) -> callback(null, name)
			@ProjectCreationHandler.createBlankProject = sinon.stub().yields(null, @project)

		describe "successfully", ->
			beforeEach ->
				@ProjectImporter._initSharelatexProject @user_id, @user_id, @doc, @callback

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

				@ProjectCreationHandler.createBlankProject
					.calledWith(@user_id, @doc.title, attributes)
					.should.equal true

		describe "null checks", ->
			it "should require doc.title", (done) ->
				delete @doc.title
				@ProjectImporter._initSharelatexProject @user_id, @user_id, @doc, (error) ->
					error.message.should.equal("expected doc title, id, latest_ver_id, latex_engine, token and read_token")
					done()

			it "should require doc.latest_ver_id", (done) ->
				delete @doc.latest_ver_id
				@ProjectImporter._initSharelatexProject @user_id, @user_id, @doc, (error) ->
					error.message.should.equal("expected doc title, id, latest_ver_id, latex_engine, token and read_token")
					done()

			it "should require doc.id", (done) ->
				delete @doc.id
				@ProjectImporter._initSharelatexProject @user_id, @user_id, @doc, (error) ->
					error.message.should.equal("expected doc title, id, latest_ver_id, latex_engine, token and read_token")
					done()

			it "should require doc.latex_engine", (done) ->
				delete @doc.latex_engine
				@ProjectImporter._initSharelatexProject @user_id, @user_id, @doc, (error) ->
					error.message.should.equal("expected doc title, id, latest_ver_id, latex_engine, token and read_token")
					done()

			it "should require doc.token", (done) ->
				delete @doc.token
				@ProjectImporter._initSharelatexProject @user_id, @user_id, @doc, (error) ->
					error.message.should.equal("expected doc title, id, latest_ver_id, latex_engine, token and read_token")
					done()

			it "should require doc.read_token", (done) ->
				delete @doc.read_token
				@ProjectImporter._initSharelatexProject @user_id, @user_id, @doc, (error) ->
					error.message.should.equal("expected doc title, id, latest_ver_id, latex_engine, token and read_token")
					done()

		describe "with brand variation", ->
			it "should set brandVariationId", (done) ->
				@doc.brand_variation_id = 123
				@ProjectImporter._initSharelatexProject @user_id, @user_id, @doc, (error, project_id) =>
					expect(error).to.equal(null)
					expect(project_id).to.not.be.undefined
					# Creates project with brandVariationId = 123
					expect(
						@ProjectCreationHandler
							.createBlankProject
							.firstCall
							.args[2]
							.brandVariationId
					).to.equal 123
					done()

		describe "with export records", ->
			it "should prevent import", (done) ->
				@doc.has_export_records = true
				@ProjectImporter._initSharelatexProject @user_id, @user_id, @doc, (error) ->
					error.message.should.equal("project has export records")
					done()

		describe "with any title", ->
			beforeEach ->
				@ProjectImporter._initSharelatexProject @user_id, @user_id, @doc, @callback

			it "should fix any invalid characters in the project name", ->
				@ProjectCreationHandler.createBlankProject
					.calledWith(@user_id, 'fixed-project-name')
					.should.equal true

		describe "with a owner_id different to exporting user", ->
			beforeEach ->
				@owner_id = 'mock-owner-id'
				@ProjectImporter._initSharelatexProject @user_id, @owner_id, @doc, @callback

			it "should create the project with the correct owner", ->
				expect(@ProjectCreationHandler.createBlankProject.firstCall.args[0])
					.to.equal @owner_id

	describe "_startExport", ->
		beforeEach ->
			@V1SharelatexApi.request = sinon.stub().yields(null, {}, @doc = { "mock": "doc" })
			@ProjectImporter._startExport @v1_project_id, @v1_user_id, @callback

		it "should make a request for the doc", ->
			@V1SharelatexApi.request
				.calledWith({
					method: "POST"
					url: "http://overleaf.example.com/api/v1/sharelatex/users/#{@v1_user_id}/docs/#{@v1_project_id}/export/start"
				})
				.should.equal true

		it "should return the doc", ->
			@callback.calledWith(null, @doc).should.equal true

	describe "_importAcceptedInvite", ->
		beforeEach ->
			@v1_project_id = "mock-v1-project-id"
			@v2_project_id = "mock-v2-project-id"
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
			@V1SharelatexApi.request = sinon.stub().yields(null, {}, {tags: ['foo', 'bar']})

		describe "with a read-only invite", ->
			beforeEach (done) ->
				@invite.access_level = "read_only"
				@ProjectImporter._importAcceptedInvite @v1_project_id, @v2_project_id, @invite, done

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
					.calledWith(@v2_project_id, @sl_inviter_id, @sl_invitee_id, PrivilegeLevels.READ_ONLY)
					.should.equal true

		describe "with a read-write invite", ->
			beforeEach (done) ->
				@invite.access_level = "read_write"
				@ProjectImporter._importAcceptedInvite @v1_project_id, @v2_project_id, @invite, done

			it "should add the SL invitee to project, with readAndWrite privilege level", ->
				@CollaboratorsHandler.addUserIdToProject
					.calledWith(@v2_project_id, @sl_inviter_id, @sl_invitee_id, PrivilegeLevels.READ_AND_WRITE)
					.should.equal true

		describe "tags", ->
			beforeEach (done) ->
				@invite.access_level = "read_write"
				@ProjectImporter._importAcceptedInvite @v1_project_id, @v2_project_id, @invite, done

			it "should request tags for invited user", ->
				@V1SharelatexApi.request.calledWithMatch(
					{ url: "#{@settings.apis.v1.url}/api/v1/sharelatex/users/#{@invite.invitee.id}/docs/#{@v1_project_id}/export/tags"}
				).should.equal true

			it "should add tags for user", ->
				@TagsHandler.addProjectToTagName.calledWithMatch(
					@sl_invitee_id, "foo", @v2_project_id
				).should.equal true
				@TagsHandler.addProjectToTagName.calledWithMatch(
					@sl_invitee_id, "bar", @v2_project_id
				).should.equal true

		describe "null checks", ->
			it "should require invite.inviter", (done) ->
				delete @invite.inviter
				@ProjectImporter._importAcceptedInvite @v1_project_id, @v2_project_id, @invite, (error) ->
					error.message.should.equal("expected invite inviter, invitee and access_level")
					done()

			it "should require invite.invitee", (done) ->
				delete @invite.invitee
				@ProjectImporter._importAcceptedInvite @v1_project_id, @v2_project_id, @invite, (error) ->
					error.message.should.equal("expected invite inviter, invitee and access_level")
					done()

			it "should require invite.access_level", (done) ->
				delete @invite.access_level
				@ProjectImporter._importAcceptedInvite @v1_project_id, @v2_project_id, @invite, (error) ->
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

	describe "_importTokenAccessInvite", ->
		beforeEach ->
			@v1_project_id = "mock-v1-project-id"
			@v2_project_id = "mock-v2-project-id"
			@invite = {
				invitee: {
					id: 54
					email: "jane@example.com",
					name: 'Jane'
				}
			}
			@sl_invitee_id = "sl-invitee-id"
			@UserMapper.getSlIdFromOlUser = sinon.stub()
				.withArgs(@invite)
				.yields(null, @sl_invitee_id)
			@TokenAccessHandler.addReadAndWriteUserToProject = sinon.stub().yields()
			@V1SharelatexApi.request = sinon.stub().yields(null, {}, {tags: ['foo', 'bar']})

		describe 'null checks', ->
			it "should require invitee", (done) ->
				delete @invite.invitee
				@ProjectImporter._importTokenAccessInvite @v1_project_id, @v2_project_id, @invite, (error) ->
					error.message.should.equal("expected invitee")
					done()

		describe 'imports successfully', ->
			beforeEach (done) ->
				@ProjectImporter._importTokenAccessInvite @v1_project_id, @v2_project_id, @invite, done

			it "should look up the invited user in SL", ->
				@UserMapper.getSlIdFromOlUser
					.calledWith(@invite.invitee)
					.should.equal true

			it "should add the SL invitee to project", ->
				@TokenAccessHandler.addReadAndWriteUserToProject
					.calledWith(@sl_invitee_id, @v2_project_id)
					.should.equal true

		describe "tags", ->
			beforeEach (done) ->
				@ProjectImporter._importTokenAccessInvite @v1_project_id, @v2_project_id, @invite, done

			it "should request tags for invited user", ->
				@V1SharelatexApi.request.calledWithMatch(
					{ url: "#{@settings.apis.v1.url}/api/v1/sharelatex/users/#{@invite.invitee.id}/docs/#{@v1_project_id}/export/tags"}
				).should.equal true

			it "should add tags for user", ->
				@TagsHandler.addProjectToTagName.calledWithMatch(
					@sl_invitee_id, "foo", @v2_project_id
				).should.equal true
				@TagsHandler.addProjectToTagName.calledWithMatch(
					@sl_invitee_id, "bar", @v2_project_id
				).should.equal true

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

		describe "with an ext file, from wlfile agent", ->
			beforeEach (done) ->
				@file = {
					file: "images/image.jpeg"
					file_path: "abc/def"
					type: "ext"
					agent: "wlfile"
					agent_data:
						file: 'a'
						type: 'b'
						doc:  '234arst'
						source_doc_display_name: 'Test Project'
				}
				@ProjectImporter._writeS3ObjectToDisk = sinon.stub().yields(null, "path/on/disk")
				@ProjectImporter._importFile @project_id, @user_id, @file, done

			it "should create the file's folder", ->
				@ProjectEntityUpdateHandler.mkdirp
					.calledWith(@project_id, "/images")
					.should.equal true

			it "should download the url to disk from s3", ->
				@ProjectImporter._writeS3ObjectToDisk
					.calledWith("abc/def")
					.should.equal true

			it "should add the file to the project", ->
				linkedFileData = {
					provider: 'project_file',
					v1_source_doc_id: 234
					source_entity_path: '/a',
				}
				@ProjectEntityUpdateHandler.addFileWithoutUpdatingHistory
					.calledWith(
						@project_id, @folder_id, "image.jpeg", "path/on/disk", linkedFileData, @user_id
					)
					.should.equal true

		describe "with an ext file, from wloutput agent", ->
			beforeEach (done) ->
				@file = {
					file: "images/image.jpeg"
					file_path: "abc/def"
					type: "ext"
					agent: "wloutput"
					agent_data:
						doc:  '234arst'
						source_doc_display_name: 'Test Output Project'
				}
				@ProjectImporter._writeS3ObjectToDisk = sinon.stub().yields(null, "path/on/disk")
				@ProjectImporter._importFile @project_id, @user_id, @file, done

			it "should create the file's folder", ->
				@ProjectEntityUpdateHandler.mkdirp
					.calledWith(@project_id, "/images")
					.should.equal true

			it "should download the url to disk from s3", ->
				@ProjectImporter._writeS3ObjectToDisk
					.calledWith("abc/def")
					.should.equal true

			it "should add the file to the project", ->
				linkedFileData = {
					provider: 'project_output_file',
					v1_source_doc_id: 234
					source_output_file_path: 'output.pdf',
				}
				@ProjectEntityUpdateHandler.addFileWithoutUpdatingHistory
					.calledWith(
						@project_id, @folder_id, "image.jpeg", "path/on/disk", linkedFileData, @user_id
					)
					.should.equal true

		describe "with an ext file, from url agent", ->
			beforeEach (done) ->
				@file = {
					file: "images/image.jpeg"
					file_path: "abc/def"
					type: "ext"
					agent: "url"
					agent_data:
						url: 'http://example.com/image.jpeg'
				}
				@ProjectImporter._writeS3ObjectToDisk = sinon.stub().yields(null, "path/on/disk")
				@ProjectImporter._importFile @project_id, @user_id, @file, done

			it "should create the file's folder", ->
				@ProjectEntityUpdateHandler.mkdirp
					.calledWith(@project_id, "/images")
					.should.equal true

			it "should download the url to disk from s3", ->
				@ProjectImporter._writeS3ObjectToDisk
					.calledWith("abc/def")
					.should.equal true

			it "should add the file to the project, and upgrade to the 'url' provider", ->
				linkedFileData = {
					provider: 'url',
					url: 'http://example.com/image.jpeg'
				}
				@ProjectEntityUpdateHandler.addFileWithoutUpdatingHistory
					.calledWith(
						@project_id, @folder_id, "image.jpeg", "path/on/disk", linkedFileData, @user_id
					)
					.should.equal true

		describe "with an ext file, from mendeley agent", ->
			beforeEach (done) ->
				@file = {
					file: "images/references.bib"
					file_path: "abc/def"
					type: "ext"
					agent: "mendeley"
					agent_data:
						uid: 'xyz',
						importer_id: 4321,
						group: 'abcbetatutts'
				}
				@ProjectImporter._writeS3ObjectToDisk = sinon.stub().yields(null, "path/on/disk")
				@ProjectImporter._importFile @project_id, @user_id, @file, done

			it "should download the url to disk from s3", ->
				@ProjectImporter._writeS3ObjectToDisk
					.calledWith("abc/def")
					.should.equal true

			it "should add the file to the project, and upgrade to the 'mendeley' provider", ->
				linkedFileData = {
					provider: 'mendeley',
					v1_importer_id: 4321,
					group_id: 'abcbetatutts'
				}
				@ProjectEntityUpdateHandler.addFileWithoutUpdatingHistory
					.calledWith(
						@project_id, @folder_id, "references.bib", "path/on/disk", linkedFileData, @user_id
					)
					.should.equal true

		describe "with an ext file, from an unknown agent", ->
			beforeEach ->
				@file = {
					file: "images/image.jpeg"
					file_path: "s3/image.jpeg"
					type: "ext"
					agent: "unknown"
				}
				@ProjectImporter._importFile @project_id, @user_id, @file, @callback

			it 'should throw an error', ->
				err = @callback.lastCall.args[0]
				expect(err).to.exist

		describe "with an unknown file type", ->
			beforeEach ->
				@file = {
					file: 'linked_file.pdf'
					file_path: 's3/linked_file.pdf'
					type: 'definitely_unknown'
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
			@V1SharelatexApi.request = sinon.stub().yields()
			@ProjectImporter._confirmExport @v1_project_id, @v2_project_id, @v1_user_id, @callback

		it "should make a request for the doc", ->
			@V1SharelatexApi.request
				.calledWith({
					method: "POST"
					url: "http://overleaf.example.com/api/v1/sharelatex/users/#{@v1_user_id}/docs/#{@v1_project_id}/export/confirm"
					json: {
						doc: { @v2_project_id }
					}
				})
				.should.equal true

		it "should return the callback", ->
			@callback.called.should.equal true

	describe "_cancelExport", ->
		beforeEach ->
			@V1SharelatexApi.request = sinon.stub().yields()
			@ProjectImporter._cancelExport @v1_project_id, @v1_user_id, @callback

		it "should make a request for the doc", ->
			@V1SharelatexApi.request
				.calledWith({
					method: "POST"
					url: "http://overleaf.example.com/api/v1/sharelatex/users/#{@v1_user_id}/docs/#{@v1_project_id}/export/cancel"
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

	describe "_importTags", ->
		beforeEach (done) ->
			@V1SharelatexApi.request = sinon.stub().yields(null, {}, {tags: ['foo', 'bar']})
			@ProjectImporter._importTags(@v1_project_id, @v2_project_id, @v1_user_id, @v2_user_id, done)

		it "should request tags from v1", ->
			@V1SharelatexApi.request
				.calledWith({
					method: 'GET'
					url: "http://overleaf.example.com/api/v1/sharelatex/users/#{@v1_user_id}/docs/#{@v1_project_id}/export/tags"
				})
				.should.equal true

		it "should add tags to project", ->
			@TagsHandler.addProjectToTagName.calledWith(
				@v2_user_id, "foo", @v2_project_id
			).should.equal. true
			@TagsHandler.addProjectToTagName.calledWith(
				@v2_user_id, "bar", @v2_project_id
			).should.equal. true
