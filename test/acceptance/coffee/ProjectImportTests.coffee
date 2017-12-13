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
ProjectGetter = require "#{WEB_PATH}/app/js/Features/Project/ProjectGetter"
ProjectEntityHandler = require "#{WEB_PATH}/app/js/Features/Project/ProjectEntityHandler"
User = require "#{WEB_PATH}/test/acceptance/js/helpers/User"

BLANK_PROJECT = {
	title: "Test Project"
	latest_ver_id: 1
	latex_engine: "pdflatex"
	token: "write_token"
	read_token: "read_token"
	invites: []
	files: []
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
		throw new Error('could not find imported project') if !(project? && project[0]?)
		callback(null, project[0])

describe "ProjectImportTests", ->
	before (done) ->
		@owner = new User()
		@owner.login (error) =>
			throw error if error?
			conditions = { _id: new ObjectId(@owner.id) }
			update = { $set: { 'overleaf.accessToken': new ObjectId() } }
			db.users.update conditions, update, (error) ->
				throw error if error?
				mkdirp Settings.path.dumpFolder, done

	describe 'an empty project', ->
		before (done) ->
			@ol_project_id = 1
			MockOverleafApi.setDoc Object.assign({ id: @ol_project_id }, BLANK_PROJECT)

			MockDocUpdaterApi.clearProjectStructureUpdates()

			@owner.request.post "/overleaf/project/#{@ol_project_id}/import", (error, response, body) =>
				getProject response, (error, project) =>
					@project = project
					done()

		it 'should import a project', ->
			expect(@project).to.be.an('object')

	describe 'a project with docs', ->
		before (done) ->
			files = [
				type: 'src'
				file: 'main.tex'
				latest_content: 'Test Content'
				main: true
			]
			@ol_project_id = 2
			MockOverleafApi.setDoc Object.assign({}, BLANK_PROJECT, { id: @ol_project_id, files })

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

		it 'should version importing the doc', ->
			updates = MockDocUpdaterApi.getProjectStructureUpdates(@project._id).docUpdates
			expect(updates.length).to.equal(1)
			update = updates[0]
			expect(update.userId).to.equal(@owner._id)
			expect(update.pathname).to.equal("/main.tex")
			expect(update.docLines).to.equal("Test Content")

	describe 'a project with files', ->
		before (done) ->
			file = {
				id: new ObjectId()
				stream: fs.createReadStream(Path.resolve(__dirname + '/../files/1pixel.png'))
			}
			MockOverleafApi.setFile file
			files = [
				type: 'att'
				file: '1pixel.png'
				file_path: "file/#{file.id}"
			]
			@ol_project_id = 3
			MockOverleafApi.setDoc Object.assign({}, BLANK_PROJECT, { id: @ol_project_id, files })

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

		it 'should version importing the file', ->
			updates = MockDocUpdaterApi.getProjectStructureUpdates(@project._id).fileUpdates
			expect(updates.length).to.equal(1)
			update = updates[0]
			expect(update.userId).to.equal(@owner._id)
			expect(update.pathname).to.equal("/1pixel.png")
			expect(update.url).to.be.a('string');

	describe 'a project with unsupported file type', ->
		before (done) ->
			files = [
				type: 'ext'
				file: 'linked_file.pdf'
				file_path: "file/linked_file.pdf"
			]
			@ol_project_id = 4
			MockOverleafApi.setDoc Object.assign({}, BLANK_PROJECT, { id: @ol_project_id, files })

			MockDocUpdaterApi.clearProjectStructureUpdates()
			done()

		it 'should return an error message', (done) ->
			@owner.request.post "/overleaf/project/#{@ol_project_id}/import", (error, response, body) =>
				expect(response.statusCode).to.equal(501)
				expect(JSON.parse(body).message).to.equal("Sorry! Projects with linked or external files aren't supported yet.")
				done()
