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
			MockOverleafApi.addV1User(@user)
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

		describe 'with a v1 account that has referrals', ->
			beforeEach (done) ->
				@userWithReferrals = newUser()
				MockOverleafApi.addV1User(@userWithReferrals)
				MockOverleafApi.users[MockOverleafApi.users.length - 1].profile.referred_user_count = 5
				@user.request.post {
					url: '/login',
					json:
						email: @userWithReferrals.email
						password: 'banana'
				}, (error) =>
					return done(error) if error?
					@user.request.get {
						url: '/login/finish'
					}, done

			it 'should record the referrals in v2', (done) ->
				db.users.findOne { 'email': @userWithReferrals.email }, (error, user) =>
					return done(error) if error?
					expect(user).to.exist
					expect(user.email).to.equal @userWithReferrals.email
					expect(user.overleaf.id).to.exist
					expect(user.refered_user_count).to.equal 5
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

		describe 'with an email that exists in SL with different overleaf id', ->
			beforeEach (done) ->
				@user.ensureUserExists (err) =>
					return done err if err?
					@user.setOverleafId 99999, done

			it 'should return error', (done) ->
				@user.request.post {
					url: '/login',
					json:
						email: @user.email
						password: 'banana'
				}, (error, response, body) =>
					return done(error) if error?
					expect(response.statusCode).to.equal 500
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

		describe 'with a v2 referal id', ->
			beforeEach (done) ->
				@user2 = newUser()
				@user2.ensureUserExists done

			it 'should not fail with an invalid referal id', (done) ->
				@user.request.post {
					url: '/register?r=abcd1234&rm=d&rs=b',
					json:
						email: @user.email
						password: 'banana'
				}, (error, response, body) =>
					return done(error) if error?
					expect(response.statusCode).to.equal 200
					done()

			it 'should record a referal with a valid referal id', (done) ->
				@user.request.post {
					url: '/register?r=' + @user2.referal_id + '&rm=d&rs=b',
					json:
						email: @user.email
						password: 'banana'
				}, (error, response, body) =>
					return done(error) if error?
					expect(response.statusCode).to.equal 200
					@user2.get (error, user) ->
						return done(error) if error?
						expect(user.refered_user_count).to.equal 1
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
				MockOverleafApi.addV1User(@user)

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
