expect = require("chai").expect
fs = require "fs"
mkdirp = require "mkdirp"
Path = require "path"
Settings = require "settings-sharelatex"

WEB_PATH = '../../../../..'

{db, ObjectId} = require "#{WEB_PATH}/app/js/infrastructure/mongojs"
MockDocstoreApi = require "#{WEB_PATH}/test/acceptance/js/helpers/MockDocstoreApi"
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
	expect(response.statusCode).to.equal 302

	url_regex = /\/project\/(\w*)/
	redirect_path = response.headers.location
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
		before ->
			@ol_project_id = 1
			MockOverleafApi.setDoc Object.assign({ id: @ol_project_id }, BLANK_PROJECT)

		it 'should import a project', (done) ->
			@owner.request.get "/overleaf/project/#{@ol_project_id}/import", (error, response, body) ->
				getProject response, (error, project) ->
					expect(project).to.be.an('object')
					done()

	describe 'a project with docs', ->
		before ->
			files = [
				type: 'src'
				file: 'main.tex'
				latest_content: 'Test Content'
				main: true
			]
			@ol_project_id = 2
			MockOverleafApi.setDoc Object.assign({}, BLANK_PROJECT, { id: @ol_project_id, files })

		it 'should import the docs', (done) ->
			@owner.request.get "/overleaf/project/#{@ol_project_id}/import", (error, response, body) ->
				getProject response, (error, project) ->
					ProjectEntityHandler.getAllEntitiesFromProject project, (error, docs, files) ->
						throw error if error?
						expect(files).to.have.lengthOf(0)
						expect(docs).to.have.lengthOf(1)
						expect(docs[0].path).to.equal('/main.tex')
						done()

	describe 'a project with files', ->
		before ->
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

		it 'should import the files', (done) ->
			@owner.request.get "/overleaf/project/#{@ol_project_id}/import", (error, response, body) ->
				getProject response, (error, project) ->
					ProjectEntityHandler.getAllEntitiesFromProject project, (error, docs, files) ->
						throw error if error?
						expect(docs).to.have.lengthOf(0)
						expect(files).to.have.lengthOf(1)
						expect(files[0].path).to.equal('/1pixel.png')
						done()
