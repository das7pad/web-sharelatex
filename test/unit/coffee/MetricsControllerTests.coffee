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
				overleaf:
					host: 'some.host'
					v1Auth:
						user: 'one'
						pass: 'two'
			'request': @request = sinon.stub()
			'../../../../app/js/Features/User/UserGetter': @UserGetter =
				getUser: sinon.stub()

	describe 'metricsSegmentation', ->
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
				@MetricsController.metricsSegmentation(@req, @res, @next)

		it 'should use the request', (done) ->
			@call()
			@request.callCount.should.equal 1
			done()

		it 'should send a json response with the body', (done) ->
			@call()
			@res.json.calledWith(@body).should.equal true
			done()

