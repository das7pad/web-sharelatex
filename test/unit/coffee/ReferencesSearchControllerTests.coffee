SandboxedModule = require('sandboxed-module')
assert = require('assert')
require('chai').should()
sinon = require('sinon')
modulePath = require('path').join __dirname, '../../../app/js/ReferencesSearchController'

describe 'ReferencesSearchController', ->

	beforeEach ->
		@project_id = "abd123"
		@user_id = "abc123"
		@query = 'whatever'
		@controller = SandboxedModule.require modulePath, requires:
			'./ReferencesSearchHandler': @handler = {
				search: sinon.stub()
			}
			'../../../../app/js/Features/User/UserGetter': @UserGetter = {
				getUser: sinon.stub()
			}
			"../../../../app/js/Features/Project/ProjectGetter": @ProjectGetter = {
				getProject: sinon.stub()
			}
			'logger-sharelatex': @logger = {
				log:->
				err:->
			}
			'../../../../app/js/Features/Authentication/AuthenticationController': @AuthenticationController =
				getLoggedInUserId: sinon.stub().returns(@user_id)
		@req =
			body:
				query: @query
			params:
				Project_id: @project_id
			session:
				user:
					_id: @user_id
		@res =
			sendStatus: sinon.stub()
			json: sinon.stub()
		@fakeSearchData =
			projectId: @projectId
			hits: []

	describe 'search', ->

		beforeEach ->
			@fakeProject =
				owner_ref: "abc"
			@fakeUser =
				_id: @fakeProject.owner_ref
				features:
					referencesSearch: true
			@fakeSearchData =
				hits: []
			@ProjectGetter.getProject.callsArgWith(2, null, @fakeProject)
			@UserGetter.getUser.callsArgWith(1, null, @fakeUser)
			@handler.search.callsArgWith(2, null, @fakeSearchData)
			@call = (callback) =>
				@controller.search @req, @res
				callback()

		it 'should not produce an error', (done) ->
			@call () =>
				@res.sendStatus.callCount.should.equal 0
				@res.sendStatus.calledWith(500).should.equal false
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
				@fakeUser.features.referencesSearch = false
				@UserGetter.getUser.callsArgWith(1, null, @fakeUser)

			it 'should send a 500 response', (done) ->
				@call () =>
					@res.sendStatus.callCount.should.equal 1
					@res.sendStatus.calledWith(500).should.equal true
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
					@res.sendStatus.callCount.should.equal 1
					@res.sendStatus.calledWith(500).should.equal true
					done()

			it 'should not call handler.search', (done) ->
				@call () =>
					@handler.search.callCount.should.equal 0
					done()

		describe 'when projectgetter.getproject produces an error', ->

			beforeEach ->
				@ProjectGetter.getProject.callsArgWith(2, new Error('woops'))
				@UserGetter.getUser.callsArgWith(1, new Error('woops'))

			it 'should send a 500 response', (done) ->
				@call () =>
					@res.sendStatus.callCount.should.equal 1
					@res.sendStatus.calledWith(500).should.equal true
					done()

			it 'should not call getuser', (done) ->
				@call () =>
					@UserGetter.getUser.callCount.should.equal 0
					done()

			it 'should not call handler.search', (done) ->
				@call () =>
					@handler.search.callCount.should.equal 0
					done()

		describe 'when search produces an error', ->

			beforeEach ->
				@fakeUser.features.referencesSearch = true
				@ProjectGetter.getProject.callsArgWith(2, null, @fakeProject)
				@UserGetter.getUser.callsArgWith(1, null, @fakeUser)
				@handler.search.callsArgWith(2, new Error('woops'))

			it 'should send a 500 response', (done) ->
				@call () =>
					@res.sendStatus.callCount.should.equal 1
					@res.sendStatus.calledWith(500).should.equal true
					done()
