expect = require("chai").expect
Async = require("async")
settings = require "settings-sharelatex"
Url = require 'url'
WEB_PATH = '../../../../..'
request = require "#{WEB_PATH}/test/acceptance/js/helpers/request"
User = require "#{WEB_PATH}/test/acceptance/js/helpers/User"
MockOverleafApi = require "./helpers/MockOverleafApi"
{db, ObjectId} = require "#{WEB_PATH}/app/js/infrastructure/mongojs"
URL = require "url"

describe "SSO", ->
	beforeEach (done) ->
		@user = new User()
		@user.getCsrfToken done

	describe "init google auth", ->
		it "should redirect to google with sign_in intent", (done) ->
			@user.request.get {
				url: '/auth/google?intent=sign_in',
			}, (error, response, body) =>
				return done(error) if error?
				expect(response.statusCode).to.equal 302
				url = URL.parse(response.headers.location)
				expect(url.host).to.equal "accounts.google.com"
				done()

		it "should redirect to google with sign_up intent", (done) ->
			@user.request.get {
				url: '/auth/google?intent=sign_up',
			}, (error, response, body) =>
				return done(error) if error?
				expect(response.statusCode).to.equal 302
				url = URL.parse(response.headers.location)
				expect(url.host).to.equal "accounts.google.com"
				done()

		it "should give error with missing intent", (done) ->
			@user.request.get {
				url: '/auth/google',
			}, (error, response, body) =>
				return done(error) if error?
				expect(response.statusCode).to.equal 500
				done()

	describe "init orcid auth", ->
		it "should redirect to orcid with sign_in intent", (done) ->
			@user.request.get {
				url: '/auth/orcid?intent=sign_in',
			}, (error, response, body) =>
				return done(error) if error?
				expect(response.statusCode).to.equal 302
				url = URL.parse(response.headers.location)
				expect(url.host).to.equal "orcid.org"
				done()

		it "should redirect to orcid with sign_up intent", (done) ->
			@user.request.get {
				url: '/auth/orcid?intent=sign_up',
			}, (error, response, body) =>
				return done(error) if error?
				expect(response.statusCode).to.equal 302
				url = URL.parse(response.headers.location)
				expect(url.host).to.equal "orcid.org"
				done()

		it "should give error with missing intent", (done) ->
			@user.request.get {
				url: '/auth/orcid',
			}, (error, response, body) =>
				return done(error) if error?
				expect(response.statusCode).to.equal 500
				done()
