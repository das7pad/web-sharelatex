should = require('chai').should()
SandboxedModule = require('sandboxed-module')
Path = require "path"
modulePath = Path.join __dirname, '../../../../app/js/SharelatexAuth/SharelatexAuthHandler'
sinon = require("sinon")

describe "SharelatexAuthHandler", ->
	beforeEach ->
		@SharelatexAuthHandler = SandboxedModule.require modulePath, requires:
			"../V1SharelatexApi": @V1SharelatexApi = {
				request: sinon.stub()
			}
			"logger-sharelatex": { log: sinon.stub(), err: sinon.stub() }
			"settings-sharelatex":
				overleaf:
					host: "http://overleaf.test:5000"
				apis:
					v1:
						url: "http://overleaf.test:5000"
		@callback = sinon.stub()

	describe "createBackingAccount", ->
		it "should handle 409 response statusCode as user already created", ->
			@V1SharelatexApi.request.callsArgWith(
				1,
				null,
				{ statusCode: 409 },
				{
					user_profile: { id: 1 }
				}
			)
			user = {
				email: 'test@example.com'
				hashedPassword: 'password'
				first_name: 'First'
				last_name: 'Last'
			}
			@SharelatexAuthHandler.createBackingAccount(user, @callback)
			@callback.calledWith(null, { id: 1 }).should.equal true
