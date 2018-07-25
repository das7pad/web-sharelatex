expect = require("chai").expect
Async = require("async")
settings = require "settings-sharelatex"
Url = require 'url'
WEB_PATH = '../../../../..'
request = require "#{WEB_PATH}/test/acceptance/js/helpers/request"
User = require "#{WEB_PATH}/test/acceptance/js/helpers/User"
MockOverleafApi = require "./helpers/MockOverleafApi"
{db, ObjectId} = require "#{WEB_PATH}/app/js/infrastructure/mongojs"

v1Id = 10000
addV1User = (user) ->
	MockOverleafApi.users.push {
		email: user.email,
		pass: 'banana',
		profile:
			id: v1Id,
			email: user.email
	}
	user.v1Id = v1Id
	v1Id++

count = 0
newUser = () ->
	user = new User()
	# Make sure we get emails that don't conflict with other
	# users so we can test clean/non-existing users.
	user.email = "overleaf-auth-test-#{count++}@example.com"
	return user

describe "OverleafAuthentication", ->
	describe 'initiating login', ->
		it 'should redirect to Overleaf', (done) ->
			request.get '/overleaf/login', (error, response, body) ->
				expect(response.statusCode).to.equal 302
				url = response.headers.location
				url = Url.parse(url)
				done()

	describe 'email and password login', (done) ->
		beforeEach (done) ->
			@user = newUser()
			addV1User(@user)
			@user.getCsrfToken done

		describe 'with a correct email and password', ->
			it 'should log the user in', (done) ->
				@user.request.post {
					url: '/login/v1',
					json:
						email: @user.email
						password: 'banana'
				}, (error, response, body) =>
					return done(error) if error?
					expect(response.statusCode).to.equal 200
					db.users.findOne { 'overleaf.id': @user.v1Id }, (error, user) =>
						return done(error) if error?
						expect(user.email).to.equal @user.email
						expect(user.loginCount).to.equal 1
						expect(user.lastLoggedIn).to.be.above(new Date(Date.now() - 2000))
						done()

		describe 'with an email that exists in SL', ->
			beforeEach ->
				@user.ensureUserExists done

			it 'should redirect to SL', (done) ->
				@user.request.post {
					url: '/login/v1',
					json:
						email: @user.email
						password: 'banana'
				}, (error, response, body) =>
					return done(error) if error?
					expect(response.statusCode).to.equal 200
					redir = Url.parse(body.redir, parseQueryString:true)
					expect(redir.pathname).to.equal '/user/confirm_account_merge'
					expect(redir.host).to.equal 'www.sharelatex.dev:3000'
					expect(redir.query.token).to.exist
					done()

		describe 'with an incorrect email and password', ->
			it 'should log the user in', (done) ->
				@user.request.post {
					url: '/login/v1',
					json:
						email: @user.email
						password: 'not-the-right-password'
				}, (error, response, body) =>
					return done(error) if error?
					expect(response.statusCode).to.equal 200
					expect(body.message.type).to.equal 'error'
					expect(body.message.text).to.exist
					db.users.findOne { 'overleaf.id': @user.v1Id }, (error, user) =>
						return done(error) if error?
						expect(user).to.not.exist
						done()