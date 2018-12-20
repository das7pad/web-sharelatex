Path = require "path"
SandboxedModule = require "sandboxed-module"
assert = require "assert"
chai = require "chai"
sinon = require "sinon"
sinonChai = require "sinon-chai"

chai.use sinonChai
expect = chai.expect

modulePath = Path.join __dirname, "../../../app/js/CollabratecApi"

describe "CollabratecApi", ->

	beforeEach ->
		@callback = sinon.stub()
		@response = statusCode: 200
		@body = foo: "bar"
		@request = sinon.stub().yields(null, @response, @body)
		@CollabratecApi = SandboxedModule.require modulePath, requires:
			"request": defaults: () =>
				return @request
			"settings-sharelatex": collabratec: api: {
				base_url: "https://ieee-collabratecqa.ieee.org"
				hmac_key: "foo"
				secret: "bar"
			}

	describe "request", ->
		before ->
			@origDate = global.Date
			global.Date = () -> toUTCString: () -> "Thu, 20 Dec 2018 14:16:58 GMT"

		after ->
			global.Date = @origDate

		beforeEach ->
			options =
				method: "post"
				uri: "/rest/ext/v1/document/callback/overleaf/project"
			@CollabratecApi.request "95028676", options, @callback

		it "should make request with correct headers and signature", () ->
			expect(@request).to.have.been.calledWithMatch {
				headers:
					"X-ppct-signature": "foo:C7UTNkgR4RykXLPr9xpJ9z9A6PuP/HeNOeeJeQBcIro="
					"X-ppct-date": "Thu, 20 Dec 2018 14:16:58 GMT"
					"X-extnet-access": "OTUwMjg2NzY="
				method: "post"
				uri: "/rest/ext/v1/document/callback/overleaf/project"
			}

		it "should callback with response and body", () ->
			expect(@callback).to.have.been.calledWith null, @response, @body
