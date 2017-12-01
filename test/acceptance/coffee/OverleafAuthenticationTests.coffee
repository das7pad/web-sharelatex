expect = require("chai").expect
Async = require("async")
User = require "../../../../../test/acceptance/js/helpers/User"
request = require "../../../../../test/acceptance/js/helpers/request"
settings = require "settings-sharelatex"
Url = require 'url'

describe "OverleafAuthentication", ->
	describe 'initiating login', ->
		it 'should redirect to Overleaf', (done) ->
			request.get '/overleaf/login', (error, response, body) ->
				expect(response.statusCode).to.equal 302
				url = response.headers.location
				url = Url.parse(url)
				done()