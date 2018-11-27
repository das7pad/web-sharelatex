assert = require("chai").assert
sinon = require('sinon')
chai = require('chai')
should = chai.should()
expect = chai.expect
modulePath = "../../../app/js/OpenInOverleafMiddleware.js"
SandboxedModule = require('sandboxed-module')

describe 'OpenInOverleafMiddleware', ->
	beforeEach ->
		@snip = 'snippy snippy snap snap'
		@Csrf =
			validateRequest: sinon.stub().callsArgWith(1, true)
		@AuthenticationController =
			isUserLoggedIn: sinon.stub().returns(true)
			setRedirectInSession: sinon.stub()
		@req =
			method: 'POST'
			originalUrl: '/docs'
			body:
				type: 'body'
			query:
				type: 'query'
		@res = {}
		@next = sinon.stub()

		@OpenInOverleafMiddleware = SandboxedModule.require modulePath, requires:
			"logger-sharelatex":
				log:->
				err:->
			'../../../../app/js/Features/Authentication/AuthenticationController': @AuthenticationController
			'../../../../app/js/infrastructure/Csrf': @Csrf

	describe 'middleware', ->
		beforeEach ->
			@OpenInOverleafMiddleware._renderGateway = sinon.stub()

		it 'calls the callback when the user is logged in and the csrf is valid', ->
			@OpenInOverleafMiddleware.middleware(@req, @res, @next)
			sinon.assert.called(@next)
			sinon.assert.notCalled(@OpenInOverleafMiddleware._renderGateway)

		it 'renders the gateway for submission if the user is logged in but the csrf is invalid', ->
			@Csrf.validateRequest = sinon.stub().callsArgWith(1, false)
			@OpenInOverleafMiddleware.middleware(@req, @res, @next)
			sinon.assert.calledWith(@OpenInOverleafMiddleware._renderGateway, @req, 'submit')
			sinon.assert.notCalled(@next)

		it 'renders the gateway for redirecting if the user is not logged in ', ->
			@AuthenticationController.isUserLoggedIn = sinon.stub().returns(false)
			@OpenInOverleafMiddleware.middleware(@req, @res, @next)
			sinon.assert.calledWith(@OpenInOverleafMiddleware._renderGateway, @req, 'store', sinon.match(/^\/login/))
			sinon.assert.called(@AuthenticationController.setRedirectInSession)
			sinon.assert.notCalled(@next)

		describe "when the method is GET", ->
			beforeEach ->
				@req.method = 'GET'

			it 'renders the gateway for submission if the user is logged in and the csrf is valid', ->
				@OpenInOverleafMiddleware.middleware(@req, @res, @next)
				sinon.assert.calledWith(@OpenInOverleafMiddleware._renderGateway, @req, 'submit')

			it 'renders the gateway for redirecting if the user is not logged in', ->
				@AuthenticationController.isUserLoggedIn = sinon.stub().returns(false)
				@OpenInOverleafMiddleware.middleware(@req, @res, @next)
				sinon.assert.calledWith(@OpenInOverleafMiddleware._renderGateway, @req, 'store', sinon.match(/^\/login/))
				sinon.assert.called(@AuthenticationController.setRedirectInSession)
				sinon.assert.notCalled(@next)
