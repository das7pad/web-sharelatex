MockOverleafApi = require "./helpers/MockOverleafApi"
URL = require "url"
chai = require "chai"
request = require "../../../../../test/acceptance/js/helpers/request"
settings = require "settings-sharelatex"

expect = chai.expect

describe "V2Templates", ->

	describe "/clone urls", ->

		it "should redirect article", (done) ->

			request { url: "/articles/redirect-article/clone" }, (err, response, body) ->
				return done(err) if err?
				expect(response.statusCode).to.equal 302
				url = URL.parse(response.headers.location)
				expect(url.path).to.equal '/redirect'
				done()

		it "should redirect example", (done) ->

			request { url: "/latex/examples/redirect-article/clone" }, (err, response, body) ->
				return done(err) if err?
				expect(response.statusCode).to.equal 302
				url = URL.parse(response.headers.location)
				expect(url.path).to.equal '/redirect'
				done()

		it "should redirect template", (done) ->

			request { url: "/latex/templates/redirect-article/clone" }, (err, response, body) ->
				return done(err) if err?
				expect(response.statusCode).to.equal 302
				url = URL.parse(response.headers.location)
				expect(url.path).to.equal '/redirect'
				done()
