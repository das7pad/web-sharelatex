should = require('chai').should()
expect = require('chai').expect
SandboxedModule = require('sandboxed-module')
Path = require('path')
modulePath = Path.join __dirname, '../../../../app/js/V1Redirect/V1RedirectController'
sinon = require("sinon")

describe "V1RedirectController", ->
	beforeEach ->
		@user = 
			_id: '123abc'
			overleaf: { id: 456 }

		@V1RedirectController = SandboxedModule.require modulePath, requires:
			'logger-sharelatex': log: () ->
			'../../../../../app/js/Features/Authentication/AuthenticationController':
				@AuthenticationController =
					getLoggedInUserId: sinon.stub().returns(@user._id)
			'../../../../../app/js/Features/User/UserGetter':
				@UserGetter = getUser: sinon.stub().yields(null, @user)
			'jsonwebtoken': @jwt = sign: sinon.stub().returns('mock-token')
			'settings-sharelatex': @settings = 
				overleaf: host: 'v1.overelaf.test'
				accountMerge: secret: 'jwt_secret'

		@req = query: { return_to: '/return/path?query=true'}
		@res = redirect: sinon.stub()
		@next = sinon.stub()

	describe "sign_in_and_redirect", ->
		describe "with signed in v1 user", ->
			beforeEach ->
				@V1RedirectController.sign_in_and_redirect(@req, @res, @next)

			it 'redirect', ->
				sinon.assert.calledOnce(@res.redirect)
				@res.redirect.lastCall.args.length.should.equal 1
				@res.redirect.lastCall.args[0].should.be.a 'string'

			it 'send token param', ->
				redirectUrl = @res.redirect.lastCall.args[0]
				match = redirectUrl.match(/\?token=(.*)$/)
				token = match[1]
				token.should.equal 'mock-token'

			it 'sign token', ->
				sinon.assert.calledOnce(@jwt.sign)
				signArgs = @jwt.sign.lastCall.args
				signArgs.length.should.equal 3
				signArgs[1].should.equal @settings.accountMerge.secret
				signArgs[2].expiresIn.should.equal '15m'

			it 'sign corrent payload', ->
				signArgs = @jwt.sign.lastCall.args
				payload = signArgs[0]
				Object.keys(payload).length.should.equal 3
				payload.user_id.should.equal @user.overleaf.id
				payload.intent.should.equal 'sign_in_from_v2'
				payload.unsafe_return_to.should.equal '/return/path?query=true'

		describe "with signed in non-v1 user", ->
			beforeEach ->
				@UserGetter.getUser.yields(null, { _id: '456def' })
				@V1RedirectController.sign_in_and_redirect(@req, @res, @next)

			it 'redirect', ->
				sinon.assert.calledOnce(@res.redirect)
				@res.redirect.lastCall.args.length.should.equal 1
				redirectUrl = @res.redirect.lastCall.args[0]
				redirectUrl.should.be.a 'string'

			it 'sign corrent payload', ->
				signArgs = @jwt.sign.lastCall.args
				payload = signArgs[0]
				Object.keys(payload).length.should.equal 3
				expect(payload.user_id).to.equal null
				payload.unsafe_return_to.should.equal '/return/path?query=true'

		describe "without signed in user", ->
			beforeEach ->
				@AuthenticationController.getLoggedInUserId.returns(null)
				@V1RedirectController.sign_in_and_redirect(@req, @res, @next)

			it 'redirect', ->
				sinon.assert.calledOnce(@res.redirect)
				@res.redirect.lastCall.args.length.should.equal 1
				redirectUrl = @res.redirect.lastCall.args[0]
				redirectUrl.should.be.a 'string'

			it 'sign corrent payload', ->
				signArgs = @jwt.sign.lastCall.args
				payload = signArgs[0]
				Object.keys(payload).length.should.equal 3
				expect(payload.user_id).to.equal null
				payload.unsafe_return_to.should.equal '/return/path?query=true'

		describe "with error", ->
			it 'handle UserGetter error', (done) ->
				@UserGetter.getUser.yields(new Error('Oups'))
				@V1RedirectController.sign_in_and_redirect @req, @res, (error) =>
					should.exist error
					sinon.assert.notCalled(@res.redirect)
					done()
