MockOverleafApi = require "./helpers/MockOverleafApi"
URL = require "url"
chai = require "chai"
request = require "../../../../../test/acceptance/js/helpers/request"
settings = require "settings-sharelatex"

expect = chai.expect

describe "V2Templates", ->

	pageUrls =
		"/articles": "/articles"
		"/articles/popular": "/articles/popular/page/1"
		"/articles/popular/page/2": "/articles/popular/page/2"
		"/articles/recent": "/articles/recent/page/1"
		"/articles/recent/page/2": "/articles/recent/page/2"
		"/articles/tagged/foo": "/articles/tagged/foo/page/1"
		"/articles/tagged/foo/page/2": "/articles/tagged/foo/page/2"
		"/gallery": "/gallery"
		"/gallery/popular": "/gallery/popular/page/1"
		"/gallery/popular/page/2": "/gallery/popular/page/2"
		"/gallery/recent": "/gallery/recent/page/1"
		"/gallery/recent/page/2": "/gallery/recent/page/2"
		"/gallery/tagged/foo": "/gallery/tagged/foo/page/1"
		"/gallery/tagged/foo/page/2": "/gallery/tagged/foo/page/2"
		"/latex/examples": "/latex/examples"
		"/latex/examples/popular": "/latex/examples/popular/page/1"
		"/latex/examples/popular/page/2": "/latex/examples/popular/page/2"
		"/latex/examples/recent": "/latex/examples/recent/page/1"
		"/latex/examples/recent/page/2": "/latex/examples/recent/page/2"
		"/latex/examples/tagged/foo": "/latex/examples/tagged/foo/page/1"
		"/latex/examples/tagged/foo/page/2": "/latex/examples/tagged/foo/page/2"
		"/latex/templates": "/latex/templates"
		"/latex/templates/popular": "/latex/templates/popular/page/1"
		"/latex/templates/popular/page/2": "/latex/templates/popular/page/2"
		"/latex/templates/recent": "/latex/templates/recent/page/1"
		"/latex/templates/recent/page/2": "/latex/templates/recent/page/2"
		"/latex/templates/tagged/foo": "/latex/templates/tagged/foo/page/1"
		"/latex/templates/tagged/foo/page/2": "/latex/templates/tagged/foo/page/2"

	describe "template routing", ->
		for reqUrl, apiUrl of pageUrls
			do (reqUrl, apiUrl) ->
				it "should get #{reqUrl}", (done) ->
					request { url: reqUrl }, (err, response, body) ->
						return done(err) if err?
						expect(response.statusCode).to.equal 200
						expect(MockOverleafApi.lastUrl).to.equal apiUrl
						done()

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
