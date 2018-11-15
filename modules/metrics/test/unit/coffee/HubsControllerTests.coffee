should = require('chai').should()
SandboxedModule = require('sandboxed-module')
assert = require('assert')
Path = require('path')
modulePath = Path.join __dirname, '../../../app/js/HubsController'
sinon = require("sinon")
expect = require("chai").expect

describe "HubsController", ->
	beforeEach ->
		@HubsController = SandboxedModule.require modulePath, requires:
			'settings-sharelatex': @Settings =
				apis:
					analytics:
						url: 'http://analytics:123456'
					v1:
						url: 'some.host'
						user: 'one'
						pass: 'two'
			'request': @request = sinon.stub()
			'../../../../app/js/Features/Institutions/InstitutionsGetter': @InstitutionsGetter = {}
			'logger-sharelatex':
				err: sinon.stub()
				log: sinon.stub()
		institution =
			_id: 'mock-institution-id'
			v1Id: 5
			fetchV1Data: (callback) =>
				institution = Object.assign({}, @institution)
				institution.name = 'Stanford'
				institution.portalSlug = 'slug'
				callback(null, institution)
		@req = entity: institution
		@res = { send: sinon.stub() }

	describe "institutionHub rendering", ->
		it 'renders the institution hub template', (done) ->
			@res = { render: sinon.stub() }
			usageData = "{\"count\": 10}"
			recentActivity = "[{\"title\": \"yesterday\"}]"
			@HubsController._usageData = sinon.stub().callsArgWith(1, usageData)
			@HubsController._recentActivity = sinon.stub().callsArgWith(1, recentActivity)

			@HubsController.institutionHub(@req, @res)
			@res.render.calledWith(
				sinon.match('views/institutionHub'), {
					institutionId: 5,
					institutionName: 'Stanford',
					portalSlug: 'slug',
					usageData: usageData,
					recentActivity: recentActivity
				}
			).should.equal true

			done()

	describe "recent activity", ->
		beforeEach ->
			@callback = sinon.stub()
			@dataResponse = {
				day: { users: 76, projects: 143 },
				week: { users: 221, projects: 513 },
				month: { users: 277, projects: 1006 },
				institutionId: 5
			}

		it 'fetches and formats recent activity', (done) ->
			@request.get = sinon.stub().callsArgWith(1, null, {statusCode: 200}, @dataResponse)
			@HubsController._recentActivity(5, @callback)

			formatted = [
				{ title: 'Yesterday', users: 76, docs: 143 },
				{ title: 'Last Week', users: 221, docs: 513 },
				{ title: 'Last Month', users: 277, docs: 1006 }
			]
			@callback.calledWith(formatted).should.equal true
			done()

		it 'returns null on errors and non-success status', (done) ->
			@request.get = sinon.stub().callsArgWith(1, null, {statusCode: 500}, {})
			@HubsController._recentActivity(5, @callback)
			@callback.calledWith(null).should.equal true

			@request.get = sinon.stub().callsArgWith(1, 'error', {statusCode: 200}, {})
			@HubsController._recentActivity(5, @callback)
			@callback.calledWith(null).should.equal true
			done()

		it 'returns null on errors and non-success status', (done) ->
			@request.get = sinon.stub().callsArgWith(1, null, {statusCode: 500}, {})
			@HubsController._recentActivity(5, @callback)
			@callback.calledWith(null).should.equal true

			@request.get = sinon.stub().callsArgWith(1, 'error', {statusCode: 200}, {})
			@HubsController._recentActivity(5, @callback)
			@callback.calledWith(null).should.equal true
			done()

		it 'returns empty on zero activity', (done) ->
			@dataResponse.month.users = 0
			@dataResponse.month.projects = 0
			@request.get = sinon.stub().callsArgWith(1, null, {statusCode: 200}, @dataResponse)
			@HubsController._recentActivity(5, @callback)
			@callback.calledWith([]).should.equal true
			done()

	describe "v1 api proxies", ->
		beforeEach ->
			@v1JsonResp = "[{\"validJson\": \"true\"}]"
			@request.get = sinon.stub().callsArgWith(1, null, null, @v1JsonResp)
			@institutionsApi = '/api/v2/institutions/'
			@v1Auth = {user: @Settings.apis.v1.user, pass: @Settings.apis.v1.pass}

		it 'calls correct endpoint for external collaboration', (done) ->
			@HubsController.institutionExternalCollaboration(@req, @res)
			@request.get.calledWith({
				url: @Settings.apis.v1.url + @institutionsApi + '5/external_collaboration_data'
				auth: @v1Auth
				json: true
			}).should.equal true
			@res.send.calledWith(@v1JsonResp).should.equal true
			done()

		it 'calls correct endpoint for departments', (done) ->
			@HubsController.institutionDepartments(@req, @res)
			@request.get.calledWith({
				url: @Settings.apis.v1.url + @institutionsApi + '5/departments_data'
				auth: @v1Auth
				json: true
			}).should.equal true
			@res.send.calledWith(@v1JsonResp).should.equal true
			done()

		it 'calls correct endpoint for roles', (done) ->
			@HubsController.institutionRoles(@req, @res)
			@request.get.calledWith({
				url: @Settings.apis.v1.url + @institutionsApi + '5/roles_data'
				auth: @v1Auth
				json: true
			}).should.equal true
			@res.send.calledWith(@v1JsonResp).should.equal true
			done()

		it 'calls correct endpoint with query for usageData', (done) ->
			callback = sinon.stub()
			@HubsController._usageData(5, callback)
			endpoint = /5\/usage_signup_data\?start_date=\d{13}&end_date=\d{13}/
			@request.get.calledWith({
				url: sinon.match(endpoint)
				auth: @v1Auth
				json: true
			}).should.equal true
			callback.calledWith(@v1JsonResp).should.equal true
			done()
