should = require('chai').should()
SandboxedModule = require('sandboxed-module')
path = require('path')
sinon = require('sinon')
Errors = require('../../../../../../app/js/Features/Errors/Errors')

modulePath = path.join __dirname, '../../../../app/js/ProjectList/ProjectListGetter'

describe "ProjectListGetter", ->
	beforeEach ->
		@ProjectListGetter = SandboxedModule.require modulePath, requires:
			'settings-sharelatex':
				overleaf:
					host: 'http://overleaf.example.com'
				apis:
					v1:
						url: 'http://overleaf.example.com'
			'logger-sharelatex': { log: sinon.stub() }
			'../../../../../app/js/Features/Errors/Errors': Errors
			"../../../../../app/js/Features/User/UserGetter": @UserGetter = {}
			"../V1SharelatexApi": @V1SharelatexApi = {}
		@v1_user_id = 'mock-v1-id'
		@v2_user_id = 'mock-v2-id'
		@callback = sinon.stub()

	describe 'findAllUsersProjects', ->
		beforeEach ->
			@UserGetter.getUser = sinon.stub().yields(null, overleaf: id: @v1_user_id)
			@V1SharelatexApi.request = sinon.stub().yields(null, {statusCode: 200}, @list = {
				"projects": [{
					id: '123MockOLId'
					title: 'Mock OL title'
				}],
				"tags": [{
					name: 'Mock tag name'
					project_ids: ['123MockOLId']
				}],
				"project_pagination": {
					total_items: 1
				}
			})
			@ProjectListGetter.findAllUsersProjects @v2_user_id, @callback

		it 'should get the user', ->
			@UserGetter.getUser
				.calledWith(@v2_user_id)
				.should.equal true

		it 'should make a request for the project list', ->
			@V1SharelatexApi.request
				.calledWith({
					method: "GET"
					url: "http://overleaf.example.com/api/v1/sharelatex/users/#{@v1_user_id}/docs"
					qs:
						per: 1000
						exclude_v2_projects: true
				})
				.should.equal true

		it 'should return the projects list', ->
			@callback.calledWith(null, {
				projects: @list.projects
				tags: @list.tags
				hasHiddenV1Projects: false
			}).should.equal true

		describe 'with large number of V1 projects', ->
			beforeEach ->
				@V1SharelatexApi.request = sinon.stub().yields(null, {statusCode: 200}, @list = {
					"projects": [{
						id: '123MockOLId'
						title: 'Mock OL title'
					}],
					"tags": [{
						name: 'Mock tag name'
						project_ids: ['123MockOLId']
					}],
					"project_pagination": {
						total_items: 1001 # Exceeds the limit of 1000 projects
					}
				})
				@ProjectListGetter.findAllUsersProjects @v1_user_id, @callback

			it 'should set the hasHiddenV1Projects to true', ->
				@callback.calledWith(null, {
					projects: @list.projects
					tags: @list.tags
					hasHiddenV1Projects: true
				}).should.equal true
