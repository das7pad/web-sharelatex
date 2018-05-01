expect = require("chai").expect

WEB_PATH = '../../../../..'

{db, ObjectId} = require "#{WEB_PATH}/app/js/infrastructure/mongojs"
MockDocstoreApi = require "#{WEB_PATH}/test/acceptance/js/helpers/MockDocstoreApi"
MockFilestoreApi = require "./helpers/MockFilestoreApi"
MockTPRApi = require "./helpers/MockTPRApi"
ProjectEntityHandler = require "#{WEB_PATH}/app/js/Features/Project/ProjectEntityHandler"
User = require "#{WEB_PATH}/test/acceptance/js/helpers/User"

describe "ImportBibtex", ->
	before (done) ->
		@owner = new User()
		@owner.login (error) =>
			throw error if error?
			conditions = { _id: new ObjectId(@owner.id) }
			update = { $set: { 'features.mendeley': true} }
			db.users.update conditions, update, (error) =>
				throw error if error?
				@owner.createProject 'tpr-test-project', (error, project_id) =>
					throw error if error?
					@project_id = project_id
					done()

	it 'can import a reference', (done) ->
		@owner.request.post "/project/#{@project_id}/test_provider/bibtex/import", (error, response, body) =>
			expect(response.statusCode).to.equal 201
			ProjectEntityHandler.getAllFiles @project_id, (error, files) ->
				throw error if error?
				expect(files).to.have.key '/test_provider.bib'
				file = files['/test_provider.bib']
				expect(file.rev).to.equal 0
				done()
