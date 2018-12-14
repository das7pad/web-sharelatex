expect = require("chai").expect
fs = require "fs"
mkdirp = require "mkdirp"
Path = require "path"
Settings = require "settings-sharelatex"

WEB_PATH = '../../../../..'

{db, ObjectId} = require "#{WEB_PATH}/app/js/infrastructure/mongojs"
MockProjectHistoryApi = require "./helpers/MockProjectHistoryApi"
MockOverleafApi = require "./helpers/MockOverleafApi"
MockV1HistoryApi = require "#{WEB_PATH}/test/acceptance/js/helpers/MockV1HistoryApi"
User = require "#{WEB_PATH}/test/acceptance/js/helpers/User"

describe "ProjectZipDownloadTests", ->
	before (done) ->
		@owner = new User()
		@owner.setV1Id MockOverleafApi.nextV1Id(), (error) =>
			return done(error) if error?
			@owner.login done

	describe 'a project the user has access to', ->
		before (done) ->
			@doc = {
				id: MockOverleafApi.nextV1Id(),
				exported: false,
				latest_ver_id: 30,
				onExportStart: () =>
					setTimeout () =>
						@doc.exported = true
						@doc.latest_ver_id = 42
					, 200
			}
			MockOverleafApi.setDoc @doc
			@owner.request "/overleaf/project/#{@doc.id}/download/zip", (error, @response, @body) =>
				done(error)

		it "should return the doc at latest exported version", ->
			expect(@response.statusCode).to.equal 200
			expect(@body).to.equal "Mock zip for #{@doc.id} at version 42"

	describe "a project the user doesn't have access to", ->
		before (done) ->
			@doc = {
				id: MockOverleafApi.nextV1Id(),
				authorized: false
			}
			MockOverleafApi.setDoc @doc
			@owner.request "/overleaf/project/#{@doc.id}/download/zip", (error, @response, @body) =>
				done(error)

		it "should return a 403", ->
			expect(@response.statusCode).to.equal 403