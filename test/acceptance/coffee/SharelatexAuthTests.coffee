expect = require("chai").expect
Async = require("async")
User = require "../../../../../test/acceptance/js/helpers/User"
settings = require "settings-sharelatex"
Url = require 'url'
jwt = require "jsonwebtoken"

describe "SharelatexAuth", ->
	describe 'with a valid jwt with valid data', ->
		before (done) ->
			@user = new User()
			@user.ensureUserExists (error) =>
				throw error if error?
				@token = jwt.sign(
					{ user_id: @user.id, login: true },
					settings.accountMerge.secret,
					{ expiresIn: '15m' }
				)
				@user.request.get "/overleaf/auth_from_sl", {
					qs:
						token: @token
					followRedirect: false
				}, (error, @response, @body) =>
					throw error if error?
					done()

		it 'should log the user in', (done) ->
			@user.isLoggedIn (error, loggedIn) ->
				throw error if error?
				expect(loggedIn).to.equal true
				done()

		it 'should redirect to /project', ->
			expect(@response.statusCode).to.equal 302
			expect(@response.headers.location).to.equal '/project'

	describe 'with an invalid jwt', ->
		before (done) ->
			@user = new User()
			@user.ensureUserExists (error) =>
				throw error if error?
				@token = 'invalid-token'
				@user.request.get "/overleaf/auth_from_sl", {
					qs:
						token: @token
					followRedirect: false
				}, (error, @response, @body) =>
					throw error if error?
					done()

		it 'should not log the user in', (done) ->
			@user.isLoggedIn (error, loggedIn) ->
				throw error if error?
				expect(loggedIn).to.equal false
				done()

		it 'should return a 400', ->
			expect(@response.statusCode).to.equal 400

	describe 'with a valid jwt with invalid data', ->
		before (done) ->
			@user = new User()
			@user.ensureUserExists (error) =>
				throw error if error?
				@token = jwt.sign(
					{ user_id: @user.id }, # missing login parameter
					settings.accountMerge.secret,
					{ expiresIn: '15m' }
				)
				@user.request.get "/overleaf/auth_from_sl", {
					qs:
						token: @token
					followRedirect: false
				}, (error, @response, @body) =>
					throw error if error?
					done()

		it 'should not log the user in', (done) ->
			@user.isLoggedIn (error, loggedIn) ->
				throw error if error?
				expect(loggedIn).to.equal false
				done()

		it 'should return a 400', ->
			expect(@response.statusCode).to.equal 400
