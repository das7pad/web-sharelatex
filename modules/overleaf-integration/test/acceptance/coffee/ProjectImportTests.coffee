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
{ProjectInvite} = require "#{WEB_PATH}/app/js/models/ProjectInvite"
{UserStub} = require "#{WEB_PATH}/app/js/models/UserStub"

BLANK_PROJECT = {
	title: "Test Project"
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

	url_regex = /\/project\/(\w*)/
	redirect_path = JSON.parse(response.body).redir
	expect(redirect_path).to.match(url_regex)

	project_id = url_regex.exec(redirect_path)[1]
	expect(project_id).to.be.a('string')

	ProjectGetter.getProject project_id, (error, project) ->
		throw error if error?
		throw new Error('could not find imported project') if !project?
		callback null, project

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
			@owner_v1_id = 123
			update = { $set: { 'overleaf.id': @owner_v1_id } }
			db.users.update conditions, update, (error) ->
				throw error if error?
				mkdirp Settings.path.dumpFolder, done

	describe 'an empty project', ->
		before (done) ->
			@ol_project_id = 1
			MockOverleafApi.setDoc Object.assign({ id: @ol_project_id }, BLANK_PROJECT, {title: "empty project"})

			MockDocUpdaterApi.clearProjectStructureUpdates()

			@owner.request.post "/overleaf/project/#{@ol_project_id}/import", (error, response, body) =>
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
			MockOverleafApi.setDoc Object.assign({}, BLANK_PROJECT, { id: @ol_project_id, files, title: "docs project" })

			MockDocUpdaterApi.clearProjectStructureUpdates()

			@owner.request.post "/overleaf/project/#{@ol_project_id}/import", (error, response, body) =>
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
			MockOverleafApi.setDoc Object.assign({}, BLANK_PROJECT, { id: @ol_project_id, files, title: "files project" })

			MockDocUpdaterApi.clearProjectStructureUpdates()

			@owner.request.post "/overleaf/project/#{@ol_project_id}/import", (error, response, body) =>
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

	describe 'a project with a brand variation id', ->
		before (done) ->
			@ol_project_id = 1
			stuff = Object.assign(
				{ id: @ol_project_id },
				BLANK_PROJECT,
				{
					title: "project with brand variation id"
					brand_variation_id: 123
				}
			)
			MockOverleafApi.setDoc stuff

			MockDocUpdaterApi.clearProjectStructureUpdates()

			@owner.request.post "/overleaf/project/#{@ol_project_id}/import", (error, response, body) =>
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
			MockOverleafApi.setDoc Object.assign({}, BLANK_PROJECT, { id: @ol_project_id, files, title: "New name" })

			MockDocUpdaterApi.clearProjectStructureUpdates()
			done()

		it 'should return an error message', (done) ->
			@owner.request.post "/overleaf/project/#{@ol_project_id}/import", (error, response, body) =>
				expect(response.statusCode).to.equal(501)
				expect(JSON.parse(body).message).to.equal("Sorry! Projects with linked or external files aren't fully supported yet.")
				done()

	describe 'a project with labels', ->
		before (done) ->
			@ol_project_id = 1
			@collaborator_v1_id = 234
			@date = new Date()
			labels = [
				{ user_id: @owner_v1_id, history_version: 1, comment: 'hello', created_at: @date }
				{ user_id: @collaborator_v1_id, history_version: 2, comment: 'goodbye', created_at: @date }
				{ history_version: 3, comment: 'foobar', created_at: @date }
			]
			MockOverleafApi.setDoc Object.assign({}, BLANK_PROJECT, { id: @ol_project_id, labels, title: "Project with labels" })

			MockDocUpdaterApi.clearProjectStructureUpdates()
			MockProjectHistoryApi.reset()

			@owner.request.post "/overleaf/project/#{@ol_project_id}/import", (error, response, body) =>
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
			MockOverleafApi.setDoc Object.assign({ id: @ol_project_id }, BLANK_PROJECT, { title: "foo/bar/baz" })

			MockDocUpdaterApi.clearProjectStructureUpdates()

			@owner.request.post "/overleaf/project/#{@ol_project_id}/import", (error, response, body) =>
				getProject response, (error, project) =>
					@project = project
					done()

		it 'should import a project', ->
			expect(@project).to.be.an('object')
			expect(@project.name).to.equal('foo-bar-baz')

	describe 'a project with a long name', ->
		before (done) ->
			@ol_project_id = 1
			MockOverleafApi.setDoc Object.assign({ id: @ol_project_id }, BLANK_PROJECT, { title: "x".repeat(160) })

			MockDocUpdaterApi.clearProjectStructureUpdates()

			@owner.request.post "/overleaf/project/#{@ol_project_id}/import", (error, response, body) =>
				getProject response, (error, project) =>
					@project = project
					done()

		it 'should import a project', ->
			expect(@project).to.be.an('object')
			expect(@project.name).to.equal('x'.repeat(150))

	describe 'a project that uses the "latex_dvipdf" engine', ->
		before (done) ->
			@ol_project_id = 1
			MockOverleafApi.setDoc Object.assign({ id: @ol_project_id }, BLANK_PROJECT, { latex_engine: 'latex_dvipdf', title: "dvipdf project" })

			MockDocUpdaterApi.clearProjectStructureUpdates()

			@owner.request.post "/overleaf/project/#{@ol_project_id}/import", (error, response, body) =>
				getProject response, (error, project) =>
					@project = project
					done()

		it 'should import using the "latex" compiler', ->
			expect(@project).to.be.an('object')
			expect(@project.compiler).to.equal('latex')

	describe 'a project with invites', ->
		before (done) ->
			@ol_project_id = 1
			@pendingInviteCode = 'pending-invite-code'

			@acceptedInvitee = newUser()
			MockOverleafApi.addV1User(@acceptedInvitee)
			@pendingInvitee = newUser()
			MockOverleafApi.addV1User(@pendingInvitee)
			@inviter = newUser()
			MockOverleafApi.addV1User(@inviter)

			MockOverleafApi.setDoc Object.assign({ id: @ol_project_id }, BLANK_PROJECT, {
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

			@owner.request.post "/overleaf/project/#{@ol_project_id}/import", (error, response, body) =>
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

			@tokenAccessInvitee = newUser()
			MockOverleafApi.addV1User(@tokenAccessInvitee)

			MockOverleafApi.setDoc Object.assign({ id: @ol_project_id }, BLANK_PROJECT, {
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

			@owner.request.post "/overleaf/project/#{@ol_project_id}/import", (error, response, body) =>
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
