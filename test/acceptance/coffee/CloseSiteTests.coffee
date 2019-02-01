Settings = require "settings-sharelatex"
chai = require "chai"
request = require "./helpers/request"

describe "CloseSite", ->
	describe "when siteClosed: false", ->
		beforeEach ->
			Settings.closeSite = false

		it "should get page", (done) ->
			request.get "/login", (error, response, body) ->
				response.statusCode.should.equal 200
				done()

	describe "when siteClosed: true", ->
		beforeEach ->
			Settings.closeSite = true

		it "should return maintenance page", (done) ->
			request.get "/login", (error, response) ->
				response.statusCode.should.equal 503
				done()
