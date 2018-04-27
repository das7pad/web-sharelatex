should = require('chai').should()
SandboxedModule = require('sandboxed-module')
assert = require('assert')
Path = require('path')
modulePath = Path.join __dirname, '../../../app/js/V1UserFinder'
sinon = require("sinon")
expect = require("chai").expect

describe "V1UserFinder", ->
		beforeEach ->
			@V1UserFinder = SandboxedModule.require modulePath, requires:
				"logger-sharelatex": { log: sinon.stub(), err: sinon.stub() }
				"request": @request = sinon.stub()
				"settings-sharelatex": @settings =
					apis:
						v1:
							user: "scott"
							password: "tiger"

			@request.reset()

		describe "findV1UserbyEmail", ->
			describe 'when v1 responds with user id', ->
				beforeEach ->
					@request.callsArgWith(1, null, { statusCode: 200 }, { user_id: 123 } )

				it 'returns the user id', (done) ->
					@V1UserFinder.findV1UserIdbyEmail "admin@example.com", (err, data) =>
						expect(err).to.eq(null)
						expect(@request.callCount).to.equal(1)
						expect(data).to.equal(123)
						done()

			describe "when there's no user with that email", (done) ->
				beforeEach ->
					@request.callsArgWith(1, null, { statusCode: 404 })

				it "returns null", (done) ->
					@V1UserFinder.findV1UserIdbyEmail "admin@example.com", (err, data) =>
						expect(err).to.eq(null)
						expect(@request.callCount).to.equal(1)
						expect(data).to.equal(null)
						done()

			describe "when there's an error", ->
				beforeEach ->
					@request.callsArgWith(1, new Error('woops'), { statusCode: 500 })

				it "calls the error callback", (done) ->
					@V1UserFinder.findV1UserIdbyEmail "admin@example.com", (err, data) =>
						expect(err).to.be.instanceof(Error)
						done()
