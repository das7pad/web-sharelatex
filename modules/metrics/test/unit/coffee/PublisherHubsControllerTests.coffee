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

	describe "publisherHub", ->
		it 'Render the publisher hub template', (done) ->
			@res = { render: sinon.stub() }
			@PublisherHubsController._fetchTemplates = sinon.stub().callsArgWith(1, null, @data)
			@PublisherHubsController.publisherHub(@req, @res)
			@res.render.calledWith(
				sinon.match('views/publisherHub'), {
					name: 'IEEE',
					templates: @data
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
	
      
