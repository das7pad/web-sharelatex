SandboxedModule = require('sandboxed-module')
assert = require('assert')
require('chai').should()
sinon = require('sinon')
modulePath = require('path').join __dirname, '../../../app/js/GithubSyncController.js'

describe 'GithubSyncController', ->
	beforeEach ->
		@GithubSyncController = SandboxedModule.require modulePath, requires:
			'request': @request = sinon.stub()
			'settings-sharelatex': @settings = {}
			'logger-sharelatex': @logger = { log: sinon.stub(), error: sinon.stub() }
			"./GithubSyncApiHandler": @GithubSyncApiHandler = {}

		@settings.apis =
			githubSync:
				url: "http://github-sync.example.com"
		@settings.siteUrl = "http://sharelatex.example.com"

		@user_id = "user-id-123"
		@req = 
			session:
				user:
					_id: @user_id
		@res =
			redirect: sinon.stub()

	describe "login", ->
		beforeEach ->
			@loginUrl = "https://github.example.com/login/oauth/authorize?client_id=foo"
			@authUrl = "#{@settings.siteUrl}/github-sync/completeRegistration"
			@GithubSyncApiHandler.getLoginUrl = sinon.stub().callsArgWith(1, null, @loginUrl)
			@GithubSyncController.login @req, @res

		it "should call fetch the OAuth login URL from the github Sync API", ->
			@GithubSyncApiHandler.getLoginUrl
				.calledWith(@user_id)
				.should.equal true
				
		it "should redirect to the Github OAuth URL", ->
			@res.redirect
				.calledWith(@loginUrl + "&redirect_uri=#{@authUrl}")
				.should.equal true

	describe "auth", ->
		beforeEach ->
			@req.query =
				code: "github-code"
				state: "github-csrf-token"
			@GithubSyncApiHandler.doAuth = sinon.stub().callsArg(2)
			@GithubSyncController.auth @req, @res

		it "should call send the request to the github sync api", ->
			@GithubSyncApiHandler.doAuth
				.calledWith(@user_id, @req.query)
				.should.equal true
				
		it "should redirect to the settings page", ->
			@res.redirect
				.calledWith("/user/settings")
				.should.equal true


