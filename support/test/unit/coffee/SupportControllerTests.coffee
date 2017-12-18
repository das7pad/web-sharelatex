should = require('chai').should()
SandboxedModule = require('sandboxed-module')
assert = require('assert')
path = require('path')
sinon = require('sinon')
modulePath = path.join __dirname, "../../../app/js/SupportController"
expect = require("chai").expect

describe "SupportController", ->

	beforeEach ->
		@settings = 
			front:
				sl_secure_token:"1234231321312"
				auth_secret:"dasdmeqkweqw"
			
		@UserGetter = 
			getUser:sinon.stub()
		@SupportDetailsManager = 
			_getDetails:sinon.stub()
		@controller = SandboxedModule.require modulePath, requires:
			"./SupportDetailsManager":@SupportDetailsManager
			"settings-sharelatex":@settings
			"logger-sharelatex": 
				log:->
				err:->
				warn:->
			"metrics-sharelatex":
				Timer:->
					done:->

		@req = {body:{}, query:{}}
		@res = {}
		@stubbedUser = 
			_id:"2131321"
			first_name:"bob"
			last_name: "smith"
			recurly_url: "https://sharelatex.recurly.com/accounts/2131321"
			role:"student"
			institution:"sheffield"
		@stubbedSubscription =
			recurlySubscription_id:"12341321"


	describe "renderInfoPanelLoader", ->

		it "should not call get user if sl_secure_token is not sent and 404", (done)->
			@req.body.email = "bob@smith.com"
			@res.sendStatus = (statusCode)=>
				@SupportDetailsManager._getDetails.called.should.equal false
				statusCode.should.equal 404
				done()
			@controller.getUserInfo @req, @res

		it "should returning 404 if sl_secure_token is wrong", (done)->
			@req.body.email = "bob@smith.com"
			@req.body.sl_secure_token = "wrong"
			@res.sendStatus = (statusCode)=>
				@SupportDetailsManager._getDetails.called.should.equal false
				statusCode.should.equal 404
				done()
			@controller.getUserInfo @req, @res

		it "should return 422 if email is not set and secure token is correct", (done)->
			@req.body.email = undefined
			@req.body.sl_secure_token = @settings.front.sl_secure_token
			@res.sendStatus = (statusCode)=>
				@UserGetter.getUser.called.should.equal false
				statusCode.should.equal 422
				done()
			@controller.getUserInfo @req, @res

		it "should message if user does not exist in db", (done)->
			@req.body.email = "bob@smith.com"
			@req.body.sl_secure_token = @settings.front.sl_secure_token
			@SupportDetailsManager._getDetails.callsArgWith(1, null, {})
			@res.send = (data)=>
				@SupportDetailsManager._getDetails.called.should.equal true
				data.should.equal "<h4>User not registered</h4>"
				done()
			@controller.getUserInfo @req, @res

		it "should render html if match is found", (done)->
			@req.body.email = "bob@smith.com"
			@req.body.sl_secure_token = @settings.front.sl_secure_token
			json = {_id:"123132"}
			@SupportDetailsManager._getDetails.callsArgWith(1, null, json)
			@res.render = (path, data)=>
				@SupportDetailsManager._getDetails.calledWith("bob@smith.com").should.equal true
				path.should.contain "user_info_panel"
				data._id.should.equal json._id
				done()
			@controller.getUserInfo @req, @res

	describe "renderInfoPanelLoader", ->

		it "should send 404 if auth_secret is not correct", (done)->
			@req.query.auth_secret = "wrong"
			@res.sendStatus = (status)=>
				status.should.equal 404
				done()
			@controller.renderInfoPanelLoader @req, @res

		it "should render html if auth_secret is correct", (done)->
			@req.query.auth_secret = @settings.front.auth_secret
			@res.render = (page, data)=>
				data.sl_secure_token.should.equal @settings.front.sl_secure_token
				done()
			@controller.renderInfoPanelLoader @req, @res


