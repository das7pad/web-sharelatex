SandboxedModule = require('sandboxed-module')
assert = require('assert')
require('chai').should()
sinon = require('sinon')
ObjectId = require("mongojs").ObjectId
modulePath = require('path').join __dirname, '../../../app/js/MendeleyAuthHandler.js'

describe 'MendeleyAuthHandler', ->
	beforeEach ->

		@MendeleyAuthHandler = SandboxedModule.require modulePath, requires:
			'request': @request = sinon.stub()
			'settings-sharelatex': @settings =
				siteUrl: "http://example.com"	
			'../../../../app/js/Features/User/UserUpdater': @UserUpdater =
				updateUser: sinon.stub().callsArgWith(2, null)
			'simple-oauth2': () -> @oauth2 =
				authCode:
					authorizeURL: () -> @authorizationUri = "http://authorizationUri.com"
					getToken: sinon.stub().callsArgWith(1, null, {access_token: true, refresh_token: true})
			"logger-sharelatex": @logger = 
				log: sinon.stub()
				err:->

		@user_id = ObjectId().toString()

		@req = 
			session:
				user:
					_id: @user_id
			query:
				code: 1
		@res =
			redirect: sinon.stub()

	describe "startAuth", ->
		beforeEach ->
			@MendeleyAuthHandler.startAuth @req, @res, @next

		it "should redirect to the authorization Uri", ->
			@res.redirect.calledWith("http://authorizationUri.com").should.equal true

	describe "tokenExchange", ->
		beforeEach ->	
			@update =
				$set:
					mendeley:
						access_token: true
						refresh_token: true

			@MendeleyAuthHandler.tokenExchange @req, @res, @next

		it "should update user mendeley info", ->
			@UserUpdater.updateUser.calledWith(@user_id, @update).should.equal true

		it "should redirect to bibtex", ->
			@res.redirect.calledWith("/bibtex").should.equal true

	describe "unlink", ->
		beforeEach ->
			@update =
				$unset:
					mendeley: true

			@MendeleyAuthHandler.unlink @req, @res, @next

		it "should unset user mendeley info", ->
			@UserUpdater.updateUser.calledWith(@user_id, @update).should.equal true

		it "should redirect to user settings page", ->
			@res.redirect.calledWith("/user/settings").should.equal true
