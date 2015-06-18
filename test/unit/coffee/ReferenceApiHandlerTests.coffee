SandboxedModule = require('sandboxed-module')
assert = require('assert')
require('chai').should()
sinon = require('sinon')
ObjectId = require("mongojs").ObjectId
modulePath = require('path').join __dirname, '../../../app/js/ReferencesApiHandler.js'

describe 'ReferencesApiHandler', ->
	beforeEach ->

		@ReferencesApiHandler = SandboxedModule.require modulePath, requires:
			'request': @request = sinon.stub()
			'settings-sharelatex': @settings =
				apis:
					references:
						url: "http://references.example.com"
				mongo:
					url: "mongodb://localhost/sharelatex"		
			'mongojs':
				connect:-> @db = { users: { findOne : sinon.stub().callsArgWith(2, null, { features: {mendeley:true}, mendeley:true}) } }
				ObjectId: ObjectId

		@user_id = ObjectId().toString()

		@req = 
			session:
				user:
					_id: @user_id
		@res =
			redirect: sinon.stub()
			json: sinon.stub()
			send: sinon.stub()

	describe "startAuth", ->
		beforeEach ->
			@redirect = "http://localhost/tokenexchange"
			@ReferencesApiHandler.makeRequest = sinon.stub().callsArgWith(1, true, {}, {redirect: @redirect} )
			@ReferencesApiHandler.startAuth @req, @res

		it "should redirect to the complete auth url", ->
			@res.redirect.calledWith(@redirect).should.equal true

	describe "completeAuth", ->
		beforeEach ->
			@ReferencesApiHandler.makeRequest = sinon.stub().callsArgWith(1, true, {}, {} )
			@ReferencesApiHandler.completeAuth @req, @res

		it "should redirect to user settings page", ->
			@res.redirect.calledWith("/user/settings").should.equal true

	describe "makeRequest", ->

		it "should call request with right params", ->
			@opts = 
				url: "/someUrl"
			@ReferencesApiHandler.makeRequest @opts
			@opts.url = "#{@settings.apis.references.url}#{@opts.url}"
			@request.calledWith(@opts).should.equal true

	describe "reindex", ->

		it "should return json result", ->
			@result =
				user: 
					features:
						mendeley: true
					mendeley: true
				reindex: true

			@ReferencesApiHandler.makeRequest = sinon.stub().callsArgWith(1, null, {}, {})
			@ReferencesApiHandler.reindex @req, @res, @next
			@res.json.calledWith(@result).should.equal true

		it "should return an error", ->
			@ReferencesApiHandler.makeRequest = sinon.stub().callsArgWith(1, true, {}, {})
			@ReferencesApiHandler.reindex @req, @res, @next
			@res.send.calledWith(500).should.equal true
