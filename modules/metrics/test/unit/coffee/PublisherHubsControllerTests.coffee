should = require('chai').should()
SandboxedModule = require('sandboxed-module')
assert = require('assert')
Path = require('path')
modulePath = Path.join __dirname, '../../../app/js/PublisherHubsController'
sinon = require("sinon")
expect = require("chai").expect

describe "PublisherHubsController", ->
	beforeEach ->
		@PublisherHubsController = SandboxedModule.require modulePath, requires:
			'settings-sharelatex': @Settings =
				apis:
					analytics:
						url: 'http://analytics:123456'
					v1:
						url: 'some.host'
						user: 'one'
						pass: 'two'
			'request': @request = sinon.stub()
			'logger-sharelatex':
				err: sinon.stub()
				log: sinon.stub()
		@publisher =
			_id: 'mock-publsiher-id'
			slug: 'ieee'
			fetchV1Data: (callback) =>
				publisher = Object.assign({}, @publisher)
				publisher.name = 'IEEE'
				callback(null, publisher)
		@req = entity: @publisher
		@res = { send: sinon.stub() }
		@data = [
			{
				doc_id: 209,
				title: 'title_1',
				original_created_date: '2017-07-03T15:03:59.264Z',
				updated_date: '2018-02-27T11:34:39.832Z'
			},
			{
				doc_id: 208,
				title: 'title_2',
				original_created_date: '2018-09-23T12:20:35.320Z',
				updated_date: '2018-09-23T12:20:35.320Z'
			}
		]
		@mockAnalytics =	{
			monthly_summary: { new_projects: 0, active_projects: 0, new_collaborators: 0 },
			yearly_summary: {
				hours_editing: 0,
				active_users: 0,
				active_projects: 0,
				advanced_active_projects: 0,
				v1Templates: {
					'208': {'new_projects': 10, active_projecst: 1},
					'209': {'new_projects': 1, active_projecst: 0},
				}
			}
		}

	describe "publisherHub", ->
		it 'Render the publisher hub template', (done) ->
			@res = { render: sinon.stub() }
			@PublisherHubsController._fetchTemplates = sinon.stub().callsArgWith(1, null, @data)
			@PublisherHubsController._fetchAnalytics = sinon.stub().callsArgWith(1, null, @mockAnalytics)
			@PublisherHubsController.publisherHub(@req, @res)
			@res.render.calledWith(
				sinon.match('views/publisherHub'), {
					name: 'IEEE',
					templates: @data,
					templatesAnalytics: @mockAnalytics.yearly_summary.v1Templates,
					yearlySummary: @mockAnalytics.yearly_summary,
					monthlySummary: @mockAnalytics.monthly_summary
				}
			).should.equal true

			done()

		it 'should fetch templates from v1', (done) ->
			@callback = sinon.stub()
			@request.get = sinon.stub().callsArgWith(1, null, {statusCode: 200}, @data)
			@PublisherHubsController._fetchTemplates(@publisher, @callback)
			@request.get.calledOnce.should.equal.true
			@request.get.calledWith({
				url: @Settings.apis.v1.url + '/api/v2/brands/' + @publisher.slug + '/templates'
				auth: {user: @Settings.apis.v1.user, pass: @Settings.apis.v1.pass}
				json: true
			}).should.equal true
			@callback.calledWith(null, @data).should.equal true
			done()

		it 'should fetch data from analytics', (done) ->
			@callback = sinon.stub()
			@request.get = sinon.stub().callsArgWith(1, null, {statusCode: 200}, @mockAnalytics)
			@PublisherHubsController._fetchAnalytics(@data, @callback)
			@request.get.calledOnce.should.equal.true
			console.log(@request.get.lastCall)
			@request.get.calledWith({
				url: @Settings.apis.analytics.url + '/recentV1TemplateIdsActivity?v1_templates=209,208'
				json: true
			}).should.equal true
			@callback.calledWith(null, @mockAnalytics).should.equal true
			done()
