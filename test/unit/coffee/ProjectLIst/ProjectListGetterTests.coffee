should = require('chai').should()
SandboxedModule = require('sandboxed-module')
path = require('path')
sinon = require('sinon')
Errors = require('../../../../../../app/js/Features/Errors/Errors')

modulePath = path.join __dirname, '../../../../app/js/ProjectList/ProjectListGetter'

describe "ProjectListGetter", ->
	beforeEach ->
		@ProjectListGetter = SandboxedModule.require modulePath, requires:
			'../OAuth/OAuthRequest': @oAuthRequest = sinon.stub()
			'logger-sharelatex': { log: sinon.stub() }
			'settings-sharelatex':
				overleaf:
					host: 'http://overleaf.example.com'
			'../../../../../app/js/Features/Errors/Errors': Errors
		@userId = 'mock-user-id'
		@callback = sinon.stub()

	describe 'findAllUsersProjects', ->
		beforeEach ->
			@oAuthRequest.yields(null, @list = {
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
			@ProjectListGetter.findAllUsersProjects @userId, @callback

		it 'should make an oAuth request for the user', ->
			@oAuthRequest
				.calledWith(@userId, {
					url: 'http://overleaf.example.com/api/v1/sharelatex/docs'
					method: 'GET'
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
				@oAuthRequest.yields(null, @list = {
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
				@ProjectListGetter.findAllUsersProjects @userId, @callback

			it 'should set the hasHiddenV1Projects to true', ->
				@callback.calledWith(null, {
					projects: @list.projects
					tags: @list.tags
					hasHiddenV1Projects: true
				}).should.equal true
