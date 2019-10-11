expect = require("chai").expect
assert = require("chai").assert
async = require("async")
User = require "./helpers/User"
request = require "./helpers/request"
settings = require "settings-sharelatex"
redis = require "./helpers/redis"
_ = require 'lodash'

require "./helpers/MockDocstoreApi"
require "./helpers/MockDocUpdaterApi"
require "./helpers/MockProjectHistoryApi"

# Currently this is testing registration via the 'public-registration' module,
# whereas in production we're using the 'overleaf-integration' module.

# Expectations
expectProjectAccess = (user, projectId, callback=(err,result)->) ->
	# should have access to project
	user.openProject projectId, (err) =>
		expect(err).to.be.oneOf [null, undefined]
		callback()

expectNoProjectAccess = (user, projectId, callback=(err,result)->) ->
	# should not have access to project page
	user.openProject projectId, (err) =>
		expect(err).to.be.instanceof Error
		callback()

# Actions
tryLoginThroughRegistrationForm = (user, email, password, callback=(err, response, body)->) ->
	user.fetchCsrfToken '/register', (err) ->
		return callback(err) if err?
		user.request.post {
			url: "/register"
			json:
				email: email
				password: password
		}, callback


describe "LoginRateLimit", ->
	@timeout(5000)

	before ->
		@user = new User()
		@badEmail = "bademail+#{Math.random()}@example.com"
		@badPassword = 'badpassword'

	it 'should rate limit login attempts after 10 within two minutes', (done) ->
		@user.fetchCsrfToken '/login', (error) =>
			async.timesSeries(
				15
				, (n, cb) =>
						@user.request.post {
							url: "/login"
							json:
								email: @badEmail
								password: @badPassword
						}, (err, response, body) =>
							cb(null, body?.message?.text)
				, (err, results) =>
					# ten incorrect-credentials messages, then five rate-limit messages
					expect(results.length).to.equal 15
					assert.deepEqual(
						results,
						_.concat(
							_.fill([1..10], 'Your email or password is incorrect. Please try again'),
							_.fill([1..5], 'This account has had too many login requests. Please wait 2 minutes before trying to log in again')
						)
					)
					done()
			)


describe "CSRF protection", ->
	@timeout(5000)

	beforeEach ->
		@user = new User()
		@email = "test+#{Math.random()}@example.com"
		@password = "password11"

	afterEach ->
		@user.full_delete_user(@email)

	it 'should register with the csrf token', (done) ->
		@user.fetchCsrfToken '/register', (error) =>
				expect(error?).to.equal false
				@user.request.post {
					url: "/register"
					json:
						email: @email
						password: @password
					headers:{
						"x-csrf-token": @user.csrfToken
					}
				}, (error, response, body) =>
					expect(error?).to.equal false
					expect(response.statusCode).to.equal 200
					done()

	it 'should fail with no csrf token', (done) ->
		@user.fetchCsrfToken '/register', (error) =>
				@user.request.post {
					url: "/register"
					json:
						email: @email
						password: @password
					headers:{
						"x-csrf-token": ""
					}
				}, (error, response, body) =>
					expect(response.statusCode).to.equal 403
					done()

	it 'should fail with a stale csrf token', (done) ->
		request.get '/register', (err, res, body) =>
			@user.parseCsrfToken body, (error) =>
				oldCsrfToken = @user.csrfToken
				@user.request.get '/register', (err, res, body) =>
					@user.request.post {
						url: "/register"
						json:
							email: @email
							password: @password
						headers:{
							"x-csrf-token": oldCsrfToken
						}
					}, (error, response, body) =>
						expect(response.statusCode).to.equal 403
						done()

describe "Register", ->
	@timeout(5000)

	before ->
		@user = new User()

	it 'Set emails attribute', (done) ->
		@user.register (error, user) =>
			expect(error).to.not.exist
			expect(user.email).to.equal @user.email
			expect(user.emails).to.exist
			expect(user.emails).to.be.a 'array'
			expect(user.emails.length).to.equal 1
			expect(user.emails[0].email).to.equal @user.email
			done()

describe "Register with bonus referal id", ->
	@timeout(5000)

	before (done) ->
		@user1 = new User()
		@user2 = new User()
		async.series [
			(cb) => @user1.register cb
			(cb) => @user2.registerWithQuery '?r=' + @user1.referal_id  + '&rm=d&rs=b', cb
		], done

	it 'Adds a referal when an id is supplied and the referal source is "bonus"', (done) ->
		@user1.get (error, user) =>
			expect(error).to.not.exist
			expect(user.refered_user_count).to.equal 1

			done()

describe "LoginViaRegistration", ->
	@timeout(60000)

	before (done) ->
		@user1 = new User()
		@user2 = new User()
		async.series [
			(cb) => @user1.login cb
			(cb) => @user1.logout cb
			(cb) => redis.clearUserSessions @user1, cb
			(cb) => @user2.login cb
			(cb) => @user2.logout cb
			(cb) => redis.clearUserSessions @user2, cb
		], done
		@project_id = null

	describe "[Security] Trying to register/login as another user", ->

		it 'should not allow sign in with secondary email', (done) ->
			secondaryEmail = "acceptance-test-secondary@example.com"
			@user1.addEmail secondaryEmail, (err) =>
				@user1.loginWith secondaryEmail, (err) =>
					expect(err?).to.equal false
					@user1.isLoggedIn (err, isLoggedIn) ->
						expect(isLoggedIn).to.equal false
						done()

		it 'should have user1 login', (done) ->
			@user1.login (err) ->
				expect(err?).to.equal false
				done()

		it 'should have user1 create a project', (done) ->
			@user1.login (err) =>
				expect(err?).to.equal false
				@user1.createProject 'Private Project', (err, project_id) =>
					expect(err?).to.equal false
					@project_id = project_id
					done()

		it 'should ensure user1 can access their project', (done) ->
			expectProjectAccess @user1, @project_id, done

		it 'should ensure user2 cannot access the project', (done) ->
			expectNoProjectAccess @user2, @project_id, done

		it 'should prevent user2 from login/register with user1 email address', (done) ->
			tryLoginThroughRegistrationForm @user2, @user1.email, 'totally_not_the_right_password', (err, response, body) =>
				expect(err).to.equal null
				expect(body.redir?).to.equal false
				expect(body.message?).to.equal true
				expect(body.message).to.have.all.keys('type', 'text')
				expect(body.message.type).to.equal 'error'
				done()

		it 'should still ensure user2 cannot access the project', (done) ->
			expectNoProjectAccess @user2, @project_id, done
