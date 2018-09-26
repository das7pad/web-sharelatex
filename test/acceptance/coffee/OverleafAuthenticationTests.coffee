expect = require("chai").expect
Async = require("async")
settings = require "settings-sharelatex"
Url = require 'url'
WEB_PATH = '../../../../..'
request = require "#{WEB_PATH}/test/acceptance/js/helpers/request"
User = require "#{WEB_PATH}/test/acceptance/js/helpers/User"
MockOverleafApi = require "./helpers/MockOverleafApi"
{db, ObjectId} = require "#{WEB_PATH}/app/js/infrastructure/mongojs"
jwt = require('jsonwebtoken')

v1Id = 10000
addV1User = (user) ->
	MockOverleafApi.users.push {
		email: user.email,
		password: 'banana',
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
					url: '/login',
					json:
						email: @user.email
						password: 'banana'
				}, (error, response, body) =>
					return done(error) if error?
					expect(response.statusCode).to.equal 200
					expect(body).to.deep.equal { redir: '/overleaf/auth_from_v1' }

					@user.request.get {
						url: '/login/finish'
					}, (error, response, body) =>
						return done(error) if error?
						expect(response.statusCode).to.equal 302

						db.users.findOne { 'overleaf.id': @user.v1Id }, (error, user) =>
							return done(error) if error?
							expect(user.email).to.equal @user.email
							expect(user.loginCount).to.equal 1
							expect(user.lastLoggedIn).to.be.above(new Date(Date.now() - 2000))

							# should redirect subsequent requests to the register and login pages
							@user.request.get '/login', (error, response, body) =>
								expect(response.statusCode).to.equal 302
								expect(response.headers['location']).to.equal '/project'
								@user.request.get '/register', (error, response, body) =>
									expect(response.statusCode).to.equal 302
									expect(response.headers['location']).to.equal '/project'
									done()


		describe 'with an email that exists in SL', ->
			beforeEach (done) ->
				@user.ensureUserExists done

			it 'complete merge', (done) ->
				@user.request.post {
					url: '/login',
					json:
						email: @user.email
						password: 'banana'
				}, (error, response, body) =>
					return done(error) if error?
					expect(response.statusCode).to.equal 200
					url = Url.parse(body.redir)
					expect(url.pathname).to.equal '/user/confirm_account_merge'

					token = jwt.sign(
						{ user_id: @user.id, overleaf_email: @user.email, merge_confirmed: true },
						settings.accountMerge.secret,
						{ expiresIn: '3h' }
					)
					@user.request.get {
						url: '/overleaf/confirmed_account_merge'
						qs:
							token: token
					}, (error, response, body) =>
						return done(error) if error?
						expect(response.statusCode).to.equal 302
						expect(response.headers.location).to.equal '/project'
						done()

		describe 'with an incorrect email and password', ->
			it 'should log the user in', (done) ->
				@user.request.post {
					url: '/login',
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

	describe 'email and password registration', (done) ->
		beforeEach (done) ->
			@user = newUser()
			@user.getCsrfToken done

		describe "with an email which doesn't exist in v1", ->
			it 'should register the user', (done) ->
				@user.request.post {
					url: '/register',
					json:
						email: @user.email
						password: 'banana'
				}, (error, response, body) =>
					return done(error) if error?
					expect(response.statusCode).to.equal 200
					db.users.findOne { 'email': @user.email }, (error, user) =>
						return done(error) if error?
						expect(user.email).to.equal @user.email
						expect(user.overleaf.id).to.exist
						expect(user.signUpDate).to.be.above(new Date(Date.now() - 2000))
						done()

		describe 'with an email that exists in SL', ->
			beforeEach (done) ->
				@user.ensureUserExists done

			it 'should return an error message', (done) ->
				@user.request.post {
					url: '/register',
					json:
						email: @user.email
						password: 'banana'
				}, (error, response, body) =>
					return done(error) if error?
					expect(response.statusCode).to.equal 200
					expect(body.message.type).to.equal 'error'
					expect(body.message.text).to.equal 'This email is in use by a Sharelatex account. Log in to ShareLaTeX to proceed'
					done()

		describe 'with an email that exists in v1', ->
			beforeEach ->
				addV1User(@user)

			it 'should return an error message', (done) ->
				@user.request.post {
					url: '/register',
					json:
						email: @user.email
						password: 'banana'
				}, (error, response, body) =>
					return done(error) if error?
					expect(response.statusCode).to.equal 200
					expect(body.message.type).to.equal 'error'
					expect(body.message.text).to.equal 'This email is already registered'
					done()
