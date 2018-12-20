expect = require("chai").expect
fs = require "fs"
mkdirp = require "mkdirp"
Path = require "path"
Settings = require "settings-sharelatex"

WEB_PATH = '../../../../..'

{db, ObjectId} = require "#{WEB_PATH}/app/js/infrastructure/mongojs"
MockDocstoreApi = require "#{WEB_PATH}/test/acceptance/js/helpers/MockDocstoreApi"
MockDocUpdaterApi = require "#{WEB_PATH}/test/acceptance/js/helpers/MockDocUpdaterApi"
MockFilestoreApi = require "./helpers/MockFilestoreApi"
MockOverleafApi = require "./helpers/MockOverleafApi"
MockProjectHistoryApi = require "./helpers/MockProjectHistoryApi"
MockS3Api = require "./helpers/MockS3Api"
ProjectGetter = require "#{WEB_PATH}/app/js/Features/Project/ProjectGetter"
ProjectEntityHandler = require "#{WEB_PATH}/app/js/Features/Project/ProjectEntityHandler"
CollaboratorsHandler = require "#{WEB_PATH}/app/js/Features/Collaborators/CollaboratorsHandler"
User = require "#{WEB_PATH}/test/acceptance/js/helpers/User"
{Project} = require "#{WEB_PATH}/app/js/models/Project"
{ProjectInvite} = require "#{WEB_PATH}/app/js/models/ProjectInvite"
{UserStub} = require "#{WEB_PATH}/app/js/models/UserStub"
{
	READ_AND_WRITE_URL_REGEX,
	READ_ONLY_URL_REGEX
} = require "#{WEB_PATH}/app/js/Features/TokenAccess/TokenAccessHandler"

OWNER_V1_ID = 123

BLANK_PROJECT = {
	title: "Test Project"
	owner: {
		id: OWNER_V1_ID
		email: 'owner@example.com'
		name: 'Owner'
	}
	latest_ver_id: 1
	latex_engine: "pdflatex"
	token: "write_token"
	read_token: "read_token"
	invites: []
	files: []
	labels: []
}

getProject = (response, callback) ->
	expect(response.statusCode).to.equal 200

	handleProjectCb = (error, project) ->
		throw error if error?
		throw new Error('could not find imported project') if !project?
		callback null, project

	redirect_path = JSON.parse(response.body).redir
	if READ_AND_WRITE_URL_REGEX.test(redirect_path)
		id = READ_AND_WRITE_URL_REGEX.exec(redirect_path)[1]
		token = READ_AND_WRITE_URL_REGEX.exec(redirect_path)[2]
		expect(token).to.be.a('string')
		Project.findOne { "tokens.readAndWrite": "#{id}#{token}" }, handleProjectCb
	else if READ_ONLY_URL_REGEX.test(redirect_path)
		token = READ_ONLY_URL_REGEX.exec(redirect_path)[1]
		expect(token).to.be.a('string')
		Project.findOne { "tokens.readOnly": token }, handleProjectCb
	else
		expect.fail('no matching redirect found')

count = 0
newUser = () ->
	user = new User()
	# Make sure we get emails that don't conflict with other
	# users so we can test clean/non-existing users.
	user.email = "overleaf-auth-test-#{count++}@example.com"
	return user

describe "ProjectImportTests", ->
	before (done) ->
		@owner = new User()
		@owner.login (error) =>
			throw error if error?
			conditions = { _id: new ObjectId(@owner.id) }
			update = { $set: { 'overleaf.id': OWNER_V1_ID } }
			db.users.update conditions, update, (error) ->
				throw error if error?
				mkdirp Settings.path.dumpFolder, done

	describe 'an empty project', ->
		before (done) ->
			@ol_project_id = 1
			@ol_project_token = "#{@ol_project_id}abc"
			MockOverleafApi.setDoc Object.assign({ id: @ol_project_id }, BLANK_PROJECT, {token: @ol_project_token, title: "empty project"})

			MockDocUpdaterApi.clearProjectStructureUpdates()

			@owner.request.post "/overleaf/project/#{@ol_project_token}/import", (error, response, body) =>
				getProject response, (error, project) =>
					@project = project
					done()

		it 'should import a project', ->
			expect(@project).to.be.an('object')

		it 'should use the default pdflatex compiler', ->
			expect(@project.compiler).to.eq('pdflatex')

	describe 'a project with docs', ->
		before (done) ->
			files = [
				type: 'src'
				file: 'main.tex'
				latest_content: 'Test Content'
				main: true
			]
			@ol_project_id = 2
			@ol_project_token = "#{@ol_project_id}def"
			MockOverleafApi.setDoc Object.assign({}, BLANK_PROJECT, { id: @ol_project_id, token: @ol_project_token, files, title: "docs project" })

			MockDocUpdaterApi.clearProjectStructureUpdates()

			@owner.request.post "/overleaf/project/#{@ol_project_token}/import", (error, response, body) =>
				getProject response, (error, project) =>
					@project = project
					done()

		it 'should import the docs', (done) ->
			ProjectEntityHandler.getAllEntitiesFromProject @project, (error, docs, files) ->
				throw error if error?
				expect(files).to.have.lengthOf(0)
				expect(docs).to.have.lengthOf(1)
				expect(docs[0].path).to.equal('/main.tex')
				done()

		it 'should not version importing the doc', ->
			updates = MockDocUpdaterApi.getProjectStructureUpdates(@project._id).docUpdates
			expect(updates.length).to.equal(0)

	describe 'a project with files', ->
		before (done) ->
			file = {
				id: new ObjectId()
				stream: fs.createReadStream(Path.resolve(__dirname + '/../files/1pixel.png'))
			}
			MockS3Api.setFile file
			files = [
				type: 'att'
				file: '1pixel.png'
				file_path: "file/#{file.id}"
			]
			@ol_project_id = 3
			@ol_project_token = "#{@ol_project_id}ghi"
			MockOverleafApi.setDoc Object.assign({}, BLANK_PROJECT, { id: @ol_project_id, token: @ol_project_token, files, title: "files project" })

			MockDocUpdaterApi.clearProjectStructureUpdates()

			@owner.request.post "/overleaf/project/#{@ol_project_token}/import", (error, response, body) =>
				getProject response, (error, project) =>
					@project = project
					done()

		it 'should import the files', (done) ->
			ProjectEntityHandler.getAllEntitiesFromProject @project, (error, docs, files) ->
				throw error if error?
				expect(docs).to.have.lengthOf(0)
				expect(files).to.have.lengthOf(1)
				expect(files[0].path).to.equal('/1pixel.png')
				done()

		it 'should not version importing the file', ->
			updates = MockDocUpdaterApi.getProjectStructureUpdates(@project._id).fileUpdates
			expect(updates.length).to.equal(0)

	describe 'a project with an un-migrated owner', ->
		before (done) ->
			# Another user owns the project that we are importing, but is not migrated
			# to v2
			@unmigrated_v1_owner_id = 9876
			@ol_project_id = 1200000
			@ol_project_token = "#{@ol_project_id}jkl"
			MockOverleafApi.setDoc Object.assign(
				{ id: @ol_project_id },
				BLANK_PROJECT,
				{
					token: @ol_project_token
					owner: {
						id: @unmigrated_v1_owner_id
						email: 'unmigrated-owner@example.com'
						name: 'Unmigrated Owner'
					}
				}
			)

			MockDocUpdaterApi.clearProjectStructureUpdates()

			@owner.request.post "/overleaf/project/#{@ol_project_token}/import", (error, response, body) =>
				@response = response
				getProject response, (error, project) =>
					@project = project
					done()

		it 'should import a project with a user stub for the owner id', (done) ->
			user_stub_id = @project.owner_ref.toString()
			UserStub.findOne { _id: user_stub_id }, (error, user_stub) =>
				throw error if error?
				expect(user_stub.overleaf.id).to.equal @unmigrated_v1_owner_id
				done()
			return

	describe 'a project with a migrated owner', ->
		before (done) ->
			@other_owner_v1_id = 6543
			@ol_project_id = 1000000
			@ol_project_token = "#{@ol_project_id}mno"

			MockOverleafApi.setDoc Object.assign(
				{ id: @ol_project_id },
				BLANK_PROJECT,
				{
					token: @ol_project_token
					owner: {
						id: @other_owner_v1_id
						email: 'migrated@example.com'
						name: 'Migrated Owner'
					}
				}
			)

			MockDocUpdaterApi.clearProjectStructureUpdates()

			@other_owner = new User()
			@other_owner.ensureUserExists (error) =>
				throw error if error?
				@other_owner.setV1Id @other_owner_v1_id, (error) =>
					throw error if error?

					@owner.request.post "/overleaf/project/#{@ol_project_token}/import", (error, response, body) =>
						getProject response, (error, project) =>
							@project = project
							done()

		it 'should import a project with the correct owner', ->
			expect(@project.owner_ref.toString()).to.equal @other_owner._id

	describe 'a project with docs, files and external files', ->
		before (done) ->
			@ol_project_id = 100
			@ol_project_token = "#{@ol_project_id}pqr"
			file = {
				id: new ObjectId()
				stream: fs.createReadStream(Path.resolve(__dirname + '/../files/1pixel.png'))
			}
			MockS3Api.setFile file
			ext = {
				id: new ObjectId()
				stream: fs.createReadStream(Path.resolve(__dirname + '/../files/foo.bib'))
			}
			MockS3Api.setFile ext
			files = [
				{type: 'src', file: 'main.tex', latest_content: 'Test Content', main: true}
				{type: 'att', file: '1pixel.png', file_path: "file/#{file.id}"}
				{type: 'ext', file: 'foo.bib', file_path: "file/#{ext.id}", agent: "mendeley", agent_data: {importer_id:123, group:456}}
			]
			MockOverleafApi.setDoc Object.assign({}, BLANK_PROJECT, { id: @ol_project_id, token: @ol_project_token, files, title: "docs and files project" })
			MockDocUpdaterApi.clearProjectStructureUpdates()

			@owner.request.post "/overleaf/project/#{@ol_project_token}/import", (error, response, body) =>
				getProject response, (error, project) =>
					@project = project
					done()

		it 'should import the docs, files and external files', (done) ->
			ProjectEntityHandler.getAllEntitiesFromProject @project, (error, docs, files) ->
				throw error if error?
				expect(files).to.have.lengthOf(2)
				expect(docs).to.have.lengthOf(1)
				expect(docs[0].path).to.equal('/main.tex')
				expect(files[0].path).to.equal('/1pixel.png')
				expect(files[1].path).to.equal('/foo.bib')
				done()

		it 'should not version importing the doc', ->
			updates = MockDocUpdaterApi.getProjectStructureUpdates(@project._id).docUpdates
			expect(updates.length).to.equal(0)

		it 'should not version importing the file', ->
			updates = MockDocUpdaterApi.getProjectStructureUpdates(@project._id).fileUpdates
			expect(updates.length).to.equal(0)


	describe 'a project with a brand variation id', ->
		before (done) ->
			@ol_project_id = 1
			@ol_project_token = "#{@ol_project_id}stu"
			MockOverleafApi.setDoc Object.assign(
				{ id: @ol_project_id },
				BLANK_PROJECT,
				{
					token: @ol_project_token
					title: "project with brand variation id"
					brand_variation_id: 123
				}
			)

			MockDocUpdaterApi.clearProjectStructureUpdates()

			@owner.request.post "/overleaf/project/#{@ol_project_token}/import", (error, response, body) =>
				getProject response, (error, project) =>
					@project = project
					done()

		it 'should import a project with the brand variation id', ->
			expect(@project.brandVariationId).to.equal '123'

	describe 'a project with unsupported file type', ->
		before (done) ->
			files = [
				type: 'ext'
				file: 'linked_file.pdf'
				file_path: "file/linked_file.pdf"
			]
			@ol_project_id = 4
			@ol_project_token = "#{@ol_project_id}vwy"
			MockOverleafApi.setDoc Object.assign({}, BLANK_PROJECT, { id: @ol_project_id, token: @ol_project_token, files, title: "New name" })

			MockDocUpdaterApi.clearProjectStructureUpdates()
			done()

		it 'should return an error message', (done) ->
			@owner.request.post "/overleaf/project/#{@ol_project_token}/import", (error, response, body) =>
				expect(response.statusCode).to.equal(501)
				expect(JSON.parse(body).message).to.equal("Sorry! Projects with linked or external files aren't fully supported yet.")
				done()

	describe 'a project with labels', ->
		before (done) ->
			@ol_project_id = 1
			@ol_project_token = "#{@ol_project_id}zab"
			@collaborator_v1_id = 234
			@date = new Date()
			labels = [
				{ user_id: OWNER_V1_ID, history_version: 1, comment: 'hello', created_at: @date }
				{ user_id: @collaborator_v1_id, history_version: 2, comment: 'goodbye', created_at: @date }
				{ history_version: 3, comment: 'foobar', created_at: @date }
			]
			MockOverleafApi.setDoc Object.assign({}, BLANK_PROJECT, { id: @ol_project_id, token: @ol_project_token, labels, title: "Project with labels" })

			MockDocUpdaterApi.clearProjectStructureUpdates()
			MockProjectHistoryApi.reset()

			@owner.request.post "/overleaf/project/#{@ol_project_token}/import", (error, response, body) =>
				throw error if error?
				getProject response, (error, project) =>
					@project = project
					done()

		it 'creates the labels in project history with user stubs for unimported collaborators', (done) ->
			UserStub.findOne { "overleaf.id": @collaborator_v1_id }, { _id: 1 }, (error, user_stub) =>
				throw error if error?
				expect(MockProjectHistoryApi.getLabels(@project._id)[1]).to.deep.equal {
					user_id: user_stub._id.toString(), version: 2, comment: 'goodbye', created_at: @date.toISOString()
				}
				done()
			return

		it 'sets a blank label user_id to the project owner user_id', ->
			expect(MockProjectHistoryApi.getLabels(@project._id)[2]).to.deep.equal {
				user_id: @owner._id, version: 3, comment: 'foobar', created_at: @date.toISOString()
			}

	describe 'a project with name containing a /', ->
		before (done) ->
			@ol_project_id = 1
			@ol_project_token = "#{@ol_project_id}cde"
			MockOverleafApi.setDoc Object.assign({ id: @ol_project_id }, BLANK_PROJECT, { token: @ol_project_token, title: "foo/bar/baz" })

			MockDocUpdaterApi.clearProjectStructureUpdates()

			@owner.request.post "/overleaf/project/#{@ol_project_token}/import", (error, response, body) =>
				getProject response, (error, project) =>
					@project = project
					done()

		it 'should import a project', ->
			expect(@project).to.be.an('object')
			expect(@project.name).to.equal('foo-bar-baz')

	describe 'a project with a long name', ->
		before (done) ->
			@ol_project_id = 1
			@ol_project_token = "#{@ol_project_id}fgh"
			MockOverleafApi.setDoc Object.assign({ id: @ol_project_id }, BLANK_PROJECT, { token: @ol_project_token, title: "x".repeat(160) })

			MockDocUpdaterApi.clearProjectStructureUpdates()

			@owner.request.post "/overleaf/project/#{@ol_project_token}/import", (error, response, body) =>
				getProject response, (error, project) =>
					@project = project
					done()

		it 'should import a project', ->
			expect(@project).to.be.an('object')
			expect(@project.name).to.equal('x'.repeat(150))

	describe 'a project that uses the "latex_dvipdf" engine', ->
		before (done) ->
			@ol_project_id = 1
			@ol_project_token = "#{@ol_project_id}ijk"
			MockOverleafApi.setDoc Object.assign({ id: @ol_project_id }, BLANK_PROJECT, { token: @ol_project_token, latex_engine: 'latex_dvipdf', title: "dvipdf project" })

			MockDocUpdaterApi.clearProjectStructureUpdates()

			@owner.request.post "/overleaf/project/#{@ol_project_token}/import", (error, response, body) =>
				getProject response, (error, project) =>
					@project = project
					done()

		it 'should import using the "latex" compiler', ->
			expect(@project).to.be.an('object')
			expect(@project.compiler).to.equal('latex')

	describe 'a project with invites', ->
		before (done) ->
			@ol_project_id = 1
			@ol_project_token = "#{@ol_project_id}lmn"
			@pendingInviteCode = 'pending-invite-code'

			@acceptedInvitee = newUser()
			MockOverleafApi.addV1User(@acceptedInvitee)
			@pendingInvitee = newUser()
			MockOverleafApi.addV1User(@pendingInvitee)
			@inviter = newUser()
			MockOverleafApi.addV1User(@inviter)

			MockOverleafApi.setDoc Object.assign({ id: @ol_project_id }, BLANK_PROJECT, {
				token: @ol_project_token
				invites: [{
					access_level: 'read_write',
					invitee: {
						id: @acceptedInvitee.v1Id,
						email: @acceptedInvitee.email,
						name: 'acceptedInvitee'
					},
					inviter: {
						id: @inviter.v1Id,
						email: @inviter.email,
						name: 'Inviter'
					}
				}, {
					email: @pendingInvitee.email,
					access_level: 'read_only',
					code: @pendingInviteCode,
					inviter: {
						id: @inviter.v1Id,
						email: @inviter.email,
						name: 'Inviter'
					}
				}]
			})

			MockDocUpdaterApi.clearProjectStructureUpdates()

			@owner.request.post "/overleaf/project/#{@ol_project_token}/import", (error, response, body) =>
				getProject response, (error, project) =>
					@project = project
					done()

		it 'should still grant access to the owner', (done) ->
			CollaboratorsHandler.getMemberIdsWithPrivilegeLevels @project._id, (error, members) =>
				expect(members[0].id).to.equal(@owner.id)
				done()

		it 'should import the accepted invite', (done) ->
			CollaboratorsHandler.getMemberIdsWithPrivilegeLevels @project._id, (error, members) =>
				UserStub.findOne { "overleaf.id": @acceptedInvitee.v1Id }, { _id: 1 }, (error, acceptedInviteeUserStub) =>
					throw error if error?
					expect(members[1].id).to.equal(acceptedInviteeUserStub._id.toString())
					expect(members[1].privilegeLevel).to.equal('readAndWrite')
					done()
				return

		it 'should import the pending invite', (done) ->
			ProjectInvite.findOne { "token": @pendingInviteCode }, { email: 1, token: 1, privileges: 1 }, (error, projectInvite) =>
				throw error if error?
				expect(projectInvite.email).to.equal(@pendingInvitee.email)
				expect(projectInvite.token).to.equal(@pendingInviteCode)
				expect(projectInvite.privileges).to.equal('readOnly')
				done()
			return

	describe 'a project with token-access invites', ->
		before (done) ->
			@ol_project_id = 1
			@ol_project_token = "#{@ol_project_id}opq"

			@tokenAccessInvitee = newUser()
			MockOverleafApi.addV1User(@tokenAccessInvitee)

			MockOverleafApi.setDoc Object.assign({ id: @ol_project_id }, BLANK_PROJECT, {
				token: @ol_project_token
				general_access: 'read_write',
				token_access_invites: [{
					invitee: {
						id: @tokenAccessInvitee.v1Id,
						email: @tokenAccessInvitee.email,
						name: 'Token based invitee'
					}
				}]
			})

			MockDocUpdaterApi.clearProjectStructureUpdates()

			@owner.request.post "/overleaf/project/#{@ol_project_token}/import", (error, response, body) =>
				getProject response, (error, project) =>
					@project = project
					done()

		it 'should still grant access to the owner', (done) ->
			CollaboratorsHandler.getMemberIdsWithPrivilegeLevels @project._id, (error, members) =>
				expect(members[0].id).to.equal(@owner.id)
				done()

		it 'should import the invite', (done) ->
			CollaboratorsHandler.getMemberIdsWithPrivilegeLevels @project._id, (error, members) =>
				UserStub.findOne { "overleaf.id": @tokenAccessInvitee.v1Id }, { _id: 1 }, (error, tokenBasedInviteeUserStub) =>
					throw error if error?
					expect(members[1].id).to.equal(tokenBasedInviteeUserStub._id.toString())
					expect(members[1].privilegeLevel).to.equal('readAndWrite')
					done()
				return

	describe 'a project with no owner returned from v1', ->
		before (done) ->
			@ol_project_id = 1
			@ol_project_token = "#{@ol_project_id}rst"
			project = Object.assign({ id: @ol_project_id }, BLANK_PROJECT, {title: "no owner project"})
			delete project.owner
			MockOverleafApi.setDoc project
			MockDocUpdaterApi.clearProjectStructureUpdates()

			@owner.request.post "/overleaf/project/#{@ol_project_token}/import", (error, @response, body) =>
				done()

		it 'should not succeed', ->
			expect(@response.statusCode).to.equal 501

	describe 'a project with collabratec users', ->
		before (done) ->
			@ol_project_id = 1
			@ol_project_token = "#{@ol_project_id}uvw"
			@user_stub_v1_id = 789
			MockOverleafApi.setDoc Object.assign(
				{},
				BLANK_PROJECT,
				{
					id: @ol_project_id,
					token: @ol_project_token,
					collabratec_users: [
						{
							user_id: OWNER_V1_ID,
							collabratec_document_id: "8888",
						},
						{
							user_id: @user_stub_v1_id,
							collabratec_document_id: "9999",
							collabratec_privategroup_id: "1111"
						},
					]
				}
			)

			MockDocUpdaterApi.clearProjectStructureUpdates()

			@owner.request.post "/overleaf/project/#{@ol_project_token}/import", (error, response, body) =>
				getProject response, (error, project) =>
					@project = project
					done()

		it 'should import a project with collabratecUsers when user exists', ->
			expect(@project.collabratecUsers[0].user_id.toString()).to.equal @owner.id
			expect(@project.collabratecUsers[0].collabratec_document_id).to.equal "8888"

		it 'should create stub user when collabratec user does not exist', (done) ->
			UserStub.findOne { _id: @project.collabratecUsers[1].user_id }, (error, user_stub) =>
				throw error if error?
				expect(user_stub.overleaf.id).to.equal @user_stub_v1_id
				expect(@project.collabratecUsers[1].collabratec_document_id).to.equal "9999"
				expect(@project.collabratecUsers[1].collabratec_privategroup_id).to.equal "1111"
				done()
			return
