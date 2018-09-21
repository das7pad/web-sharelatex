expect = require("chai").expect
Async = require("async")
settings = require "settings-sharelatex"
Url = require 'url'
jwt = require('jsonwebtoken')
logger = require('logger-sharelatex')
MockOverleafApi = require "./helpers/MockOverleafApi"

WEB_PATH = '../../../../..'
User = require "#{WEB_PATH}/test/acceptance/js/helpers/User"

describe "OverleafPasswordChange", ->
	describe 'changing password', ->
		beforeEach (done) ->
			@user = new User()
			MockOverleafApi.addV1User(@user)
			@user.login (error) =>
				done(error) if error?
				@user.setOverleafId(@user.v1Id, done)

		it 'should redirect to Overleaf', (done) ->
			@user.request.post {
				url: '/user/change_password/v1',
				json:
					currentPassword: @user.password,
					newPassword1: 'theNewPassw0rd',
					newPassword2: 'theNewPassw0rd',
			}, (error, response, body) =>
				expect(error).to.be.null
				expect(response.statusCode).to.equal 200
				expect(body.message.type).to.equal 'success'
				done()

		it 'should error on bad password', (done) ->
			@user.request.post {
				url: '/user/change_password/v1',
				json:
					currentPassword: @user.password,
					newPassword1: 'short',
					newPassword2: 'short',
			}, (error, response, body) =>
				expect(error).to.be.null
				expect(response.statusCode).to.equal 200
				expect(body.message.type).to.equal 'error'
				done()

