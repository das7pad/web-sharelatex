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
User = require "#{WEB_PATH}/test/acceptance/js/helpers/User"

logger = require "logger-sharelatex"
logger.logger.level('fatal')


describe 'GitBridge', ->
	before ->
		@owner = new User()
		@ownerV1UserId = 42
		@projectId = null
		async.series [
			(cb) => @owner.mongoUpdate {$set: {isAdmin: true, 'overleaf.id': @ownerV1UserId}}, cb
			(cb) => @owner.login cb
			(cb) => @owner.createProject "git-bridge test", (err, projectId) =>
				@projectId = projectId
				cb(err)
		]

	describe 'getting latest project version', ->
		before ->

		it 'should whatever', (done) ->
			done()
