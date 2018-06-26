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
			'logger-sharelatex': { log: sinon.stub() }
			"request": @request = {}
			'../../../../../app/js/Features/Errors/Errors': Errors
			"../../../../../app/js/Features/User/UserGetter": @UserGetter = {}
		@v1_user_id = 'mock-v1-id'
		@v2_user_id = 'mock-v2-id'
		@callback = sinon.stub()

	describe 'findAllUsersProjects', ->
		beforeEach ->
			@UserGetter.getUser = sinon.stub().yields(null, overleaf: id: @v1_user_id)
			@request.get = sinon.stub().yields(null, @list = {
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

		it 'should make an request for the project list', ->
			@request.get
				.calledWith({
					url: "http://overleaf.example.com/api/v1/sharelatex/users/#{@v1_user_id}/docs"
					json: true
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
				@request.get = sinon.stub().yields(null, @list = {
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
