SandboxedModule = require('sandboxed-module')
assert = require('assert')
require('chai').should()
expect = require('chai').expect
sinon = require('sinon')
modulePath = require('path').join __dirname, '../../../app/js/ReferencesSearchHandler'

describe 'ReferencesSearchHandler', ->

	beforeEach ->
		@projectId = 'abc'
		@query = 'something'
		@fakeSearchResults =
			projectId: @projectId
			hits: []
		@handler = SandboxedModule.require modulePath, requires:
			'settings-sharelatex':
				apis:
					references:
						url: 'example.com/references'
			'request': @request =
				get: sinon.stub()
			'logger-sharelatex':
				log: sinon.stub()
				err: sinon.stub()

	describe 'search', ->

		beforeEach ->
			@request.get.callsArgWith(1, null, {statusCode: 200}, @fakeSearchResults)
			@call = (callback) =>
				@handler.search @projectId, @query, callback

		it 'should produce search results', (done) ->
			@call (err, result) =>
				expect(result).to.not.equal null
				expect(result).to.deep.equal @fakeSearchResults
				done()

		it 'should not produce an error', (done) ->
			@call (err, result) =>
				expect(err).to.equal null
				done()

		it 'should make request to references service', (done) ->
			@call (err, result) =>
				@request.get.callCount.should.equal 1
				done()

		describe 'when request produces an error', ->

			beforeEach ->
				@request.get.callsArgWith(1, new Error('woops'))

			it 'should produce and error', (done) ->
				@call (err, result) =>
					expect(err).to.not.equal null
					expect(err).to.be.instanceof Error
					done()
