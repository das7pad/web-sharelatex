should = require('chai').should()
SandboxedModule = require('sandboxed-module')
assert = require('assert')
Path = require('path')
modulePath = Path.join __dirname, '../../../app/js/MetricsController'
sinon = require("sinon")
expect = require("chai").expect

describe "MetricsController", ->
	beforeEach ->
		@MetricsController = SandboxedModule.require modulePath, requires:
			'settings-sharelatex': @Settings =
				apis:
					analytics:
						url: 'http://analytics:123456'
					v1:
						url: 'some.host'
						user: 'one'
						pass: 'two'
			'request': @request = sinon.stub()
			'../../../../app/js/Features/User/UserGetter': @UserGetter =
				getUser: sinon.stub()
			'../../../../app/js/Features/Project/ProjectGetter': @ProjectGetter =
				getProject: sinon.stub()
			'../../../../app/js/Features/Subscription/SubscriptionLocator': @SubscriptionLocator = {}
			'logger-sharelatex':
				err: sinon.stub()
				log: sinon.stub()
			'mongoose':
				Types:
					ObjectId: @ObjectId = sinon.stub()


	describe 'teamMetrics', ->
		it 'renders the metricsApp template', (done) ->
			@req = params: { teamId: 5 }
			@res = { render: sinon.stub() }

			@MetricsController.teamMetrics(@req, @res)

			@res.render.calledWith(
				sinon.match('views/metricsApp'), {
					metricsEndpoint: '/graphs',
					resourceId: 5,
					resourceType: 'team',
				}
			).should.equal true

			done()

	describe 'analyticsProxy', ->
		it 'proxies requests to the analytics service', (done) ->
			@request.get  = sinon.stub().returns(@request)
			@request.on   = sinon.stub().returns(@request)
			@request.pipe = sinon.stub().returns(@request)

			@req = { originalUrl: '/graphs?resource_type=team&resource_id=6' }

			@MetricsController.analyticsProxy(@req, @res)

			@request.get.calledWith(
				'http://analytics:123456/graphs?resource_type=team&resource_id=6'
			).should.equal true

			done()


	describe 'userMetricsSegmentation', ->
		beforeEach ->
			@req =
				params:
					user_id: @user_id = '1234'
			@user =
				_id: @user_id
				overleaf:
					id: 45
			@memberSubscriptions = [
			  { _id: '5ad60490c34621025f26006a' },
			  { _id: '5ae8366062616006e8eb07d0' }
			]
			@UserGetter.getUser = sinon.stub().callsArgWith(2, null, @user)
			@SubscriptionLocator.getMemberSubscriptions = sinon.stub().callsArgWith(1, null, @memberSubscriptions)
			@response = {statusCode: 201}
			@v1Segmentation = {
				id : 1,
				teamIds: [3, 4],
				affiliationIds: [5, 7]
			}
			@ObjectId.isValid = () -> true
			@request.reset()
			@request.callsArgWith(1, null, @response, @v1Segmentation)
			@res =
				json: sinon.stub()
				sendStatus: sinon.stub()
			@next = sinon.stub()
			@call = () =>
				@MetricsController.userMetricsSegmentation(@req, @res, @next)

		it 'should use the request', (done) ->
			@call()
			@request.callCount.should.equal 1
			done()

		it 'should send a json response with the body', (done) ->
			@call()

			@res.json.callCount.should.equal 1
			response = @res.json.lastCall.args[0]

			expect(response).to.deep.equal({
				id : 1,
				teamIds: [3, 4],
				affiliationIds: [5, 7],
				v2TeamIds: ['5ad60490c34621025f26006a', '5ae8366062616006e8eb07d0']
			})

			done()

		it 'works if the user is not member of any team', (done) ->
			@SubscriptionLocator.getMemberSubscriptions = sinon.stub()
				.callsArgWith(1, null, null)

			@call()

			@res.json.callCount.should.equal 1
			response = @res.json.lastCall.args[0]

			expect(response).to.deep.equal({
				id : 1,
				teamIds: [3, 4],
				affiliationIds: [5, 7]
				v2TeamIds: [],
			})

			done()

		it 'handles session ids in the user_id field', (done) ->
			@ObjectId.isValid = () -> false

			@call()

			@res.sendStatus.callCount.should.equal 1
			@res.sendStatus.lastCall.args[0].should.equal 404

			done()

	describe 'projectMetricsSegmentation', ->
		beforeEach ->
			@req =
				params:
					project_id: @user_id = '1234'
			@res =
				json: sinon.stub()
			@next = sinon.stub()
			@fakeProject =
				_id: '1234'
				fromV1TemplateId: 45
				fromV1TemplateVersionId: 34
			@call = (callback) =>
				@MetricsController.projectMetricsSegmentation(@req, @res, @next)
				callback()

		describe 'when all goes well', ->
			beforeEach ->
				@ProjectGetter.getProject = sinon.stub()
					.callsArgWith(2, null, @fakeProject)

			it 'should produce the right data', (done) ->
				@call () =>
					expect(@next.callCount).to.equal 0
					expect(@res.json.calledWith({
						projectId: '1234',
						v1TemplateId: 45,
						v1TemplateVersionId: 34
					})).to.equal true
					done()

		describe 'when getting the project produces an error', ->
			beforeEach ->
				@ProjectGetter.getProject = sinon.stub()
					.callsArgWith(2, new Error('woops'))

			it 'should produce an error', (done) ->
				@call () =>
					expect(@next.callCount).to.equal 1
					expect(@next.lastCall.args[0]).to.be.instanceof Error
					done()
