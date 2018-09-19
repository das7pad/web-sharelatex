URL = require "url"
User = require "../../../../../test/acceptance/js/helpers/User"
chai = require "chai"
expect = chai.expect
request = require "../../../../../test/acceptance/js/helpers/request"

describe "OauthRedirect", ->

	beforeEach (done) ->
		@user = new User()
		@user.getCsrfToken done

	describe "/oauth/authorize", ->

		it "should redirect", (done) ->
			request.get "/oauth/authorize", (error, response, body) ->
				expect(response.statusCode).to.equal 302
				url = URL.parse(response.headers.location)
				expect(url.pathname).to.equal "/sign_in_to_v1"
				done()

		it "should url encode query params", (done) ->
			request.get "/oauth/authorize?foo=bar&bam=baz", (error, response, body) ->
				url = URL.parse(response.headers.location)
				expect(url.query).to.equal "return_to=%2Foauth%2Fauthorize%3Ffoo%3Dbar%26bam%3Dbaz"
				done()