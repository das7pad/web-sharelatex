sinon = require('sinon')
chai = require('chai')
should = chai.should()
modulePath = "../../../../app/js/ProjectImport/ProjectImportErrorRecorder.js"
SandboxedModule = require('sandboxed-module')
tk = require("timekeeper")

describe "ProjectImportErrorRecorder", ->
	beforeEach ->
		@now = new Date()
		tk.freeze(@now)
		@callback = sinon.stub()
		@ErrorRecorder = SandboxedModule.require modulePath, requires:
			"mongojs": sinon.stub().returns(@db = {})
			"settings-sharelatex": @settings = { mongo: {url: "dummy-url"}}
			"logger-sharelatex": { log: sinon.stub(), error: sinon.stub() }
			"metrics-sharelatex": @metrics = { gauge: sinon.stub() }

		@v1_project_id = 12345
		@v2_user_id = 445

	afterEach ->
		tk.reset()

	describe "record", ->
		describe "with an error", ->
			beforeEach ->
				@error = new Error('something bad')
				@db.projectImportFailures = {update: sinon.stub().yields()}
				@ErrorRecorder.record @v1_project_id, @v2_user_id, @error, @callback

			it "should record the error to mongo", ->
				@db.projectImportFailures.update
					.calledWithMatch({
						@v1_project_id
					}, {
						$set:
							v2_user_id: @v2_user_id
							error: @error.toString()
							stack: @error.stack
							ts: @now
						$inc:
							attempts: 1
						$push:
							history:
								$each: [ {v2_user_id: @v2_user_id, error: @error.toString(), stack: @error.stack, ts: @now} ]
								$position: 0
								$slice: 10
					}, {
						upsert: true
					}).should.equal true

			it "should call the callback", ->
				@callback.calledWith(@error).should.equal true

		describe "without an error", ->
			beforeEach ->
				@db.projectImportFailures = remove: sinon.stub().yields()
				@ErrorRecorder.record @v1_project_id, @v2_user_id, @error, @callback

			it "should remove any error from mongo", ->
				@db.projectImportFailures.remove
					.calledWithMatch({ @v1_project_id })
					.should.equal true

			it "should call the callback", ->
				@callback.calledWith(null).should.equal true
