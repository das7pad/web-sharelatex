should = require('chai').should()
SandboxedModule = require('sandboxed-module')
path = require('path')
sinon = require('sinon')

modulePath = path.join __dirname, '../../../../app/js/ProjectList/ProjectListGetter'

describe "ProjectListGetter", ->
	beforeEach ->
		@ProjectListGetter = SandboxedModule.require modulePath, requires:
			'../OAuth/OAuthRequest': @oAuthRequest = sinon.stub()
			'logger-sharelatex': { log: sinon.stub() }
			'settings-sharelatex':
				overleaf:
					host: 'http://overleaf.example.com'
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
				}]
			})
			@ProjectListGetter.findAllUsersProjects @userId, @callback

		it 'should make an oAuth request for the user', ->
			@oAuthRequest
				.calledWith(@userId, {
					url: 'http://overleaf.example.com/api/v1/sharelatex/docs'
					method: 'GET'
					json: true
					qs:
						per: 100
				})
				.should.equal true

		it 'should return the projects list', ->
			@callback.calledWith(null, @list).should.equal true
