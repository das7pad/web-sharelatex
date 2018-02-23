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
					v1:
						url: 'some.host'
						user: 'one'
						pass: 'two'
			'request': @request = sinon.stub()
			'../../../../app/js/Features/User/UserGetter': @UserGetter =
				getUser: sinon.stub()
			'../../../../app/js/Features/Project/ProjectGetter': @ProjectGetter =
				getProject: sinon.stub()
			'logger-sharelatex':
				err: sinon.stub()
				log: sinon.stub()

	describe 'userMetricsSegmentation', ->
		beforeEach ->
			@req =
				params:
					user_id: @user_id = '1234'
			@user =
				_id: @user_id
				overleaf:
					id: 45
			@UserGetter.getUser = sinon.stub().callsArgWith(2, null, @user)
			@response = {statusCode: 201}
			@body = {one: 1}
			@request.reset()
			@request.callsArgWith(1, null, @response, @body)
			@res =
				json: sinon.stub()
			@next = sinon.stub()
			@call = () =>
				@MetricsController.userMetricsSegmentation(@req, @res, @next)

		it 'should use the request', (done) ->
			@call()
			@request.callCount.should.equal 1
			done()

		it 'should send a json response with the body', (done) ->
			@call()
			@res.json.calledWith(@body).should.equal true
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
