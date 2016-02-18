SandboxedModule = require('sandboxed-module')
assert = require('assert')
require('chai').should()
sinon = require('sinon')
modulePath = require('path').join __dirname, '../../../app/js/ReferencesSearchController'

describe 'ReferencesSearchController', ->

	beforeEach ->
		@controller = SandboxedModule.require modulePath, requires:
			'./ReferencesSearchHandler': @handler = {
				search: sinon.stub()
			}
			'../../../../app/js/Features/User/UserGetter': @UserGetter = {
				getUser: sinon.stub()
			}
			'logger-sharelatex': @logger = {
				log:->
				err:->
			}
		@project_id = "project-id-123"
		@user_id = "user-id-123"
		@query = 'whatever'
		@req =
			body:
				query: @query
			params:
				Project_id: @project_id
			session:
				user:
					_id: @user_id
		@res =
			send: sinon.stub()
			json: sinon.stub()
		@fakeUser =
			features:
				references: true
		@fakeSearchData =
			projectId: @projectId
			hits: []

	describe 'search', ->

		beforeEach ->
			@fakeUser =
				features:
					references: true
			@fakeSearchData =
				hits: []
			@UserGetter.getUser.callsArgWith(1, null, @fakeUser)
			@handler.search.callsArgWith(2, null, @fakeSearchData)
			@call = (callback) =>
				@controller.search @req, @res
				callback()

		it 'should not produce an error', (done) ->
			@call () =>
				@res.send.callCount.should.equal 0
				@res.send.calledWith(500).should.equal false
				done()

		it 'should produce search data', (done) ->
			@call () =>
				@res.json.callCount.should.equal 1
				@res.json.calledWith(@fakeSearchData).should.equal true
				done()

		it 'should call usergetter.getuser', (done) ->
			@call () =>
				@UserGetter.getUser.callCount.should.equal 1
				done()

		it 'should call handler.search', (done) ->
			@call () =>
				@handler.search.callCount.should.equal 1
				done()

		describe 'when the user is not allowed to search', ->

			beforeEach ->
				@fakeUser.features.references = false
				@UserGetter.getUser.callsArgWith(1, null, @fakeUser)

			it 'should send a 500 response', (done) ->
				@call () =>
					@res.send.callCount.should.equal 1
					@res.send.calledWith(500).should.equal true
					done()

			it 'should not call handler.search', (done) ->
				@call () =>
					@handler.search.callCount.should.equal 0
					done()

		describe 'when getUser produces an error', ->

			beforeEach ->
				@UserGetter.getUser.callsArgWith(1, new Error('woops'))

			it 'should send a 500 response', (done) ->
				@call () =>
					@res.send.callCount.should.equal 1
					@res.send.calledWith(500).should.equal true
					done()

			it 'should not call handler.search', (done) ->
				@call () =>
					@handler.search.callCount.should.equal 0
					done()

		describe 'when search produces an error', ->

			beforeEach ->
				@fakeUser.features.references = true
				@UserGetter.getUser.callsArgWith(1, null, @fakeUser)
				@handler.search.callsArgWith(2, new Error('woops'))

			it 'should send a 500 response', (done) ->
				@call () =>
					@res.send.callCount.should.equal 1
					@res.send.calledWith(500).should.equal true
					done()
