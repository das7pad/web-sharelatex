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
logger = require('logger-sharelatex')

describe "OverleafPasswordChange", ->
	describe 'changing password', ->
		beforeEach (done) ->
			@user = new User()
			@user.login done

		it 'should redirect to Overleaf', (done) ->
			@user.request.post {
				url: '/change_password/v1',
				json:
					email: @user.email
					password: 'theNewPassw0rd'
			}, (error, response, body) =>
				expect(error).to.be.null
				expect(response.statusCode).to.equal 200
				expect(body.message.type).to.equal 'success'
				done()

		it 'should error on bad password', (done) ->
			@user.request.post {
				url: '/change_password/v1',
				json:
					email: @user.email
					password: 'short'
			}, (error, response, body) =>
				expect(error).to.be.null
				expect(response.statusCode).to.equal 200
				expect(body.message.type).to.equal 'error'
				done()

