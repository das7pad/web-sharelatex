expect = require("chai").expect
fs = require "fs"
mkdirp = require "mkdirp"
Path = require "path"
Settings = require "settings-sharelatex"
mongoose = require "mongoose"
async = require "async"
_ = require 'underscore'

WEB_PATH = '../../../../..'

{db, ObjectId} = require "#{WEB_PATH}/app/js/infrastructure/mongojs"
MockOverleafApi = require "#{WEB_PATH}/modules/overleaf-integration/test/acceptance/js/helpers/MockOverleafApi"
MockProjectHistoryApi = require "#{WEB_PATH}/test/acceptance/js/helpers/MockProjectHistoryApi"
MockDocstoreApi = require "#{WEB_PATH}/test/acceptance/js/helpers/MockDocstoreApi"
MockDocUpdaterApi = require "#{WEB_PATH}/test/acceptance/js/helpers/MockDocUpdaterApi"
User = require "#{WEB_PATH}/test/acceptance/js/helpers/User"

logger = require "logger-sharelatex"
logger.logger.level('fatal')


describe 'GitBridge', ->
	before (done) ->
		@owner = new User()
		MockOverleafApi.addV1User(@owner)
		async.series [
			(cb) => @owner.login cb
			(cb) =>
				@owner.mongoUpdate {
					$set: {
						isAdmin: true,
						'overleaf.id': @owner.v1Id,
						betaProgram: true,
						'features.gitBridge': true
					}
				}, cb
		], done

	_request = (owner, url, callback) =>
		owner.request {
			method: 'GET',
			url: url,
			headers:
				'Authorization': "Bearer #{owner.v1Id}"
			json: true
		}, callback

	_latestVersionRequest = (owner, projectId, callback) =>
		_request(owner, "/api/v0/docs/#{projectId}", callback)

	_savedVersRequest = (owner, projectId, callback) =>
		_request(owner, "/api/v0/docs/#{projectId}/saved_vers", callback)

	describe 'get saved vers', ->
		before ->

		describe 'missing project', ->
			before ->

			it 'should produce a 404 json response', (done) ->
				_savedVersRequest @owner, "#{mongoose.Types.ObjectId()}", (err, response, body) =>
					expect(err).to.not.exist
					expect(response.statusCode).to.equal 404
					expect(body.message).to.equal 'Project not found'
					done()

		describe 'native v2 project', ->
			before (done) ->
				@projectId = null
				async.series [
					(cb) => @owner.createProject "#{Math.random()}", (err, projectId) =>
						@projectId = projectId
						cb(err)
					(cb) =>
						labelOne = {
							version: 1,
							comment: "one",
							created_at: new Date().toISOString(),
							user_id: @owner._id.toString()
						}
						labelTwo = {
							version: 2,
							comment: "two",
							created_at: new Date().toISOString(),
							user_id: null
						}
						MockProjectHistoryApi.addLabel @projectId, labelOne
						MockProjectHistoryApi.addLabel @projectId, labelTwo
						cb()
				], done

			it "should send back saved-vers", (done) ->
				_savedVersRequest @owner, @projectId, (err, response, body) =>
					expect(err).to.not.exist
					expect(response.statusCode).to.equal 200
					expect(body.length).to.equal 2
					for {idx, versionId, comment, user_present, user_email} in [
						{idx: 0, versionId: 1, comment: "one", user_present: true, user_email: @owner.email},
						{idx: 1, versionId: 2, comment: "two", user_present: false}
					]
						savedVer = body[idx]
						expect(savedVer.versionId).to.exist
						expect(savedVer.comment).to.exist
						expect(savedVer.createdAt).to.exist
						expect(savedVer.user?).to.equal user_present
						expect(savedVer.versionId).to.equal versionId
						expect(savedVer.comment).to.equal comment
						if user_present
							expect(savedVer.user?.email).to.equal user_email
					done()





	describe 'get latest version info', ->
		before ->

		describe 'missing project', ->
			before ->

			it 'should produce a 404 json response', (done) ->
				_latestVersionRequest @owner, "#{mongoose.Types.ObjectId()}", (err, response, body) =>
					expect(err).to.not.exist
					expect(response.statusCode).to.equal 404
					expect(body.message).to.equal 'Project not found'
					done()

		describe 'native v2 project', ->
			before (done) ->
				@projectId = null
				async.series [
					(cb) => @owner.createProject "#{Math.random()}", (err, projectId) =>
						@projectId = projectId
						cb(err)
				], done

			describe "with author info", ->
				before (done) ->
					MockProjectHistoryApi.setProjectVersionInfo(
						@projectId,
						{version: 4, timestamp: new Date().toISOString(), v2Authors: [@owner._id]}
					)
					done()

				it "should respond with version info", (done) ->
					_latestVersionRequest @owner, @projectId, (err, response, body) =>
						expect(err).to.not.exist
						expect(response.statusCode).to.equal 200
						expect(body.latestVerId).to.equal 4
						expect(body.latestVerAt).to.exist
						expect(body.latestVerBy).to.exist
						expect(body.latestVerBy.email).to.equal @owner.email
						done()

			describe "without author info", ->
				before (done) ->
					MockProjectHistoryApi.setProjectVersionInfo(
						@projectId,
						{version: 5, timestamp: new Date().toISOString(), v2Authors: []}
					)
					done()

				it "should respond with version info", (done) ->
					_latestVersionRequest @owner, @projectId, (err, response, body) =>
						expect(err).to.not.exist
						expect(response.statusCode).to.equal 200
						expect(body.latestVerId).to.equal 5
						expect(body.latestVerAt).to.exist
						expect(body.latestVerBy).to.not.exist
						done()

		describe 'imported project', ->
			before (done) ->
				@projectId = null
				async.series [
					(cb) => @owner.createProject "#{Math.random()}", (err, projectId) =>
						@projectId = projectId
						@owner.getProject @projectId, (err, project) =>
							return cb(err) if err?
							project.overleaf = {id: 1234}
							project.tokens = {readAndWrite: '1234abcd'}
							@owner.saveProject project, cb
					(cb) =>
						MockProjectHistoryApi.setProjectVersionInfo(
							@projectId,
							{version: 6, timestamp: new Date().toISOString(), v2Authors: [@owner._id]}
						)
						cb()
				], done

			it "should respond with version info and migratedFromId", (done) ->
				_latestVersionRequest @owner, @projectId, (err, response, body) =>
					expect(err).to.not.exist
					expect(response.statusCode).to.equal 200
					expect(body.latestVerId).to.equal 6
					expect(body.latestVerAt).to.exist
					expect(body.latestVerBy).to.exist
					expect(body.latestVerBy.email).to.equal @owner.email
					expect(body.migratedFromId).to.exist
					expect(body.migratedFromId).to.equal '1234abcd'
					done()

		describe 'imported project with mismatched id and token', ->
			before (done) ->
				@projectId = null
				async.series [
					(cb) => @owner.createProject "#{Math.random()}", (err, projectId) =>
						@projectId = projectId
						@owner.getProject @projectId, (err, project) =>
							return cb(err) if err?
							project.overleaf = {id: 4545}
							project.tokens = {readAndWrite: '1234abcd'}
							@owner.saveProject project, cb
					(cb) =>
						MockProjectHistoryApi.setProjectVersionInfo(
							@projectId,
							{version: 7, timestamp: new Date().toISOString(), v2Authors: [@owner._id]}
						)
						cb()
				], done

			it "should respond with an error", (done) ->
				_latestVersionRequest @owner, @projectId, (err, response, body) =>
					expect(err).to.not.exist
					expect(response.statusCode).to.equal 500
					done()
