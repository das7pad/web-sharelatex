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
			requireLogin: ()->
				return sinon.stub().callsArg(2)
		@req =
			method: 'POST'
			originalUrl: '/docs'
			session: {}
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
			@OpenInOverleafMiddleware._setupRequest = sinon.stub().callsArg(2)
			@OpenInOverleafMiddleware._handleCsrfGateway = sinon.stub().callsArg(2)
			@OpenInOverleafMiddleware._finalizeRequest = sinon.stub().callsArg(2)

		it 'calls the callback when the user is logged in and the csrf is valid', ->
			@OpenInOverleafMiddleware.middleware(@req, @res, @next)
			sinon.assert.called(@next)

		it 'finalizes the request when the user is logged in and the csrf is valid', ->
			@OpenInOverleafMiddleware.middleware(@req, @res, @next)
			sinon.assert.called(@OpenInOverleafMiddleware._finalizeRequest)

		it 'does not call the callback when the user is not logged in', ->
			@AuthenticationController.requireLogin = ()->
				return sinon.stub()
			@OpenInOverleafMiddleware.middleware(@req, @res, @next)
			sinon.assert.notCalled(@next)

		it 'does not call the callback when the user is logged in but the csrf is invalid', ->
			@OpenInOverleafMiddleware._handleCsrfGateway = sinon.stub()
			@OpenInOverleafMiddleware.middleware(@req, @res, @next)
			sinon.assert.notCalled(@next)

	describe '_setupRequest', ->
		beforeEach ->
			@OpenInOverleafMiddleware._paramsHaveKeysOtherThanCsrfToken = sinon.stub().returns(true)
			@nostash = 'this should not be stashed'

		describe 'when the method is GET', ->
			beforeEach ->
				@req.query =
					snip: @snip
				@req.body =
					snip: @nostash
					snap: @nostash
				@req.method = 'GET'

			it 'stashes the query', ->
				@OpenInOverleafMiddleware._setupRequest(@req, @res, @next)
				expect(@req.session.stashedApiRequest.snip).to.equal @snip

			it 'does not stash the body', ->
				@OpenInOverleafMiddleware._setupRequest(@req, @res, @next)
				expect(@req.session.stashedApiRequest.snap).not.to.exist

			it 'calls the callback', ->
				@OpenInOverleafMiddleware._setupRequest(@req, @res, @next)
				sinon.assert.called(@next)

			it 'overwrites the stashed content if present', ->
				@req.session.stashedApiRequest =
					snip: @nostash
				@OpenInOverleafMiddleware._setupRequest(@req, @res, @next)
				expect(@req.session.stashedApiRequest.snip).to.equal @snip

		describe 'when the method is POST', ->
			beforeEach ->
				@req.query =
					snip: @nostash
					snap: @nostash
				@req.body =
					snip: @snip
				@req.method = 'POST'
				@OpenInOverleafMiddleware._setupRequest(@req, @res, @next)

			it 'stashes the body', ->
				expect(@req.session.stashedApiRequest.snip).to.equal @snip

			it 'does not stash the query', ->
				expect(@req.session.stashedApiRequest.snap).not.to.exist

			it 'calls the callback', ->
				sinon.assert.called(@next)

			it 'overwrites the stashed content if present', ->
				@req.session.stashedApiRequest =
					snip: @nostash
				@OpenInOverleafMiddleware._setupRequest(@req, @res, @next)
				expect(@req.session.stashedApiRequest.snip).to.equal @snip

		describe 'when nothing is passed', ->
			beforeEach ->
				@OpenInOverleafMiddleware._paramsHaveKeysOtherThanCsrfToken = sinon.stub().returns(false)

			describe 'when there is a stashed request', ->
				beforeEach ->
					@req.session.stashedApiRequest =
						snip: @snip

				it 'calls the callback when nothing is passed', ->
					@OpenInOverleafMiddleware._setupRequest(@req, @res, @next)
					sinon.assert.called(@next)

				it 'preserves the content when nothing is passed', ->
					@OpenInOverleafMiddleware._setupRequest(@req, @res, @next)
					expect(@req.session.stashedApiRequest.snip).to.equal @snip

			describe 'when nothing is stashed', ->
				it 'redirects to the root', (done) ->
					@res.redirect = (path)=>
						expect(path).to.equal '/'
						sinon.assert.notCalled(@next)
						done()
					@OpenInOverleafMiddleware._setupRequest(@req, @res, @next)

	describe '_handleCsrfGateway', ->
		beforeEach ->
			@OpenInOverleafMiddleware._finalizeRequest = sinon.stub().callsArg(2)

		it 'checks the csrf token', ->
			@OpenInOverleafMiddleware._handleCsrfGateway(@req, @res, @next)
			sinon.assert.calledWith(@Csrf.validateRequest, @req)

		it 'calls the callback when the csrf token is valid', ->
			@OpenInOverleafMiddleware._handleCsrfGateway(@req, @res, @next)
			sinon.assert.called(@next)

		it 'renders the gateway page when the method is GET', (done) ->
			@req.method = 'GET'
			@res.render = (template) =>
				expect(template).to.match /\/gateway$/
				sinon.assert.notCalled(@next)
				done()
			@OpenInOverleafMiddleware._handleCsrfGateway(@req, @res, @next)

		it 'renders the gateway page when the csrf token is invalid', (done) ->
			@Csrf.validateRequest = sinon.stub().callsArgWith(1, false)
			@res.render = (template) =>
				expect(template).to.match /\/gateway$/
				sinon.assert.notCalled(@next)
				done()
			@OpenInOverleafMiddleware._handleCsrfGateway(@req, @res, @next)

	describe '_finalizeRequest', ->
		beforeEach ->
			@req =
				method: 'POST'
				originalUrl: '/docs'
				session:
					stashedApiRequest:
						snip: @snip
				body:
					_csrf: 'foo'

		it 'unstashes the request', ->
			@OpenInOverleafMiddleware._finalizeRequest(@req, @res, @next)
			expect(@req.body.snip).to.exist
			expect(@req.body.snip).to.equal @snip

		it 'deletes the stashed request', ->
			@OpenInOverleafMiddleware._finalizeRequest(@req, @res, @next)
			expect(@req.session.stashedApiRequest).not.to.exist

		it 'calls the callback', ->
			@OpenInOverleafMiddleware._finalizeRequest(@req, @res, @next)
			sinon.assert.called(@next)

		it 'preserves the csrf token', ->
			@OpenInOverleafMiddleware._finalizeRequest(@req, @res, @next)
			expect(@req.body._csrf).to.equal 'foo'

	describe '_paramsHaveKeysOtherThanCsrfToken', ->
		beforeEach ->
			@params = {}

		it 'returns false if there are no parameters', ->
			expect(@OpenInOverleafMiddleware._paramsHaveKeysOtherThanCsrfToken(@params)).to.equal false

		it 'returns false if there is just a csrf token', ->
			@params._csrf = 'asdf'
			expect(@OpenInOverleafMiddleware._paramsHaveKeysOtherThanCsrfToken(@params)).to.equal false

		it 'returns true if there is a non-csrf parameter', ->
			@params.asdf = 'qwer'
			expect(@OpenInOverleafMiddleware._paramsHaveKeysOtherThanCsrfToken(@params)).to.equal true

		it 'returns true if there is a non-csrf parameter and a csrf token', ->
			@params.asdf = 'qwer'
			@params._csrf = 'wombat'
			expect(@OpenInOverleafMiddleware._paramsHaveKeysOtherThanCsrfToken(@params)).to.equal true