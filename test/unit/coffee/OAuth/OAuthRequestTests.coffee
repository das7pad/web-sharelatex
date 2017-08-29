should = require('chai').should()
SandboxedModule = require('sandboxed-module')
assert = require('assert')
path = require('path')
modulePath = path.join __dirname, '../../../../app/js/OAuth/OAuthRequest'
sinon = require("sinon")
expect = require("chai").expect

describe "OAuthRequest", ->
	beforeEach ->
		@OAuthRequest = SandboxedModule.require modulePath, requires:
			"request": @request = sinon.stub()
			"logger-sharelatex": { log: sinon.stub() }
			"passport-oauth2-refresh": @refresh = {}

		@user =
			overleaf:
				accessToken: @accessToken = "mock-access-token"
				refreshToken: @refreshToken = "mock-refresh-token"
			save: sinon.stub().yields()
		@callback = sinon.stub()

	describe "successfully", ->
		beforeEach ->
			@request.yields(null, { statusCode: 200 }, @body = {"mock": "response"})
			@OAuthRequest(@user, { url: "http://www.example.com" }, @callback)

		it "should make an authenticated request", ->
			@request
				.calledWith({
					url: "http://www.example.com"
					headers:
						Authorization: "Bearer #{@accessToken}"
				})
				.should.equal true

		it "should call the callback with the result", ->
			@callback.calledWith(null, @body).should.equal true

	describe "when a token refresh is needed", ->
		beforeEach ->
			@request.onCall(0).yields(null, { statusCode: 401 }, null)
			@request.onCall(1).yields(null, { statusCode: 200 }, @body = {"mock": "response"})
			@refresh.requestNewAccessToken = sinon.stub().yields(
				null, @accessToken2 = "new-access-token", @refreshToken2 = "new-refresh-token"
			)
			@OAuthRequest(@user, { url: "http://www.example.com" }, @callback)

		it "should make an authenticated request with the initial access token", ->
			@request
				.calledWith({
					url: "http://www.example.com"
					headers:
						Authorization: "Bearer #{@accessToken}"
				})
				.should.equal true

		it "should request a refresh of the access token", ->
			@refresh.requestNewAccessToken
				.calledWith('overleaf', @refreshToken)
				.should.equal true

		it 'should update the tokens on the user', ->
			@user.overleaf.accessToken.should.equal @accessToken2
			@user.overleaf.refreshToken.should.equal @refreshToken2

		it "should make an authenticated request with the new access token", ->
			@request
				.calledWith({
					url: "http://www.example.com"
					headers:
						Authorization: "Bearer #{@accessToken2}"
				})
				.should.equal true

		it "should call the callback with the result", ->
			@callback.calledWith(null, @body).should.equal true