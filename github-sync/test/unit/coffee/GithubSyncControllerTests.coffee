SandboxedModule = require('sandboxed-module')
assert = require('assert')
require('chai').should()
sinon = require('sinon')
modulePath = require('path').join __dirname, '../../../app/js/GithubSyncController.js'

describe 'GithubSyncController', ->
	beforeEach ->
		@GithubSyncController = SandboxedModule.require modulePath, requires:
			'request': @request = {}
			'settings-sharelatex': @settings = {}
			'logger-sharelatex': @logger = { log: sinon.stub(), error: sinon.stub() }

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
			@request.get = sinon.stub().callsArgWith(1, null, statusCode: 200, {url: @loginUrl})
			@GithubSyncController.login @req, @res

		it "should call fetch the OAuth login URL from the github Sync API", ->
			@request.get
				.calledWith({
					url: "#{@settings.apis.githubSync.url}/user/#{@user_id}/loginUrl"
					json: true
				})
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
			@request.post = sinon.stub().callsArgWith(1, null, statusCode: 200, null)
			@GithubSyncController.auth @req, @res

		it "should call send the request to the github sync api", ->
			@request.post
				.calledWith({
					url: "#{@settings.apis.githubSync.url}/user/#{@user_id}/completeAuth"
					json: @req.query
				})
				.should.equal true
				
		it "should redirect to the settings page", ->
			@res.redirect
				.calledWith("/user/settings")
				.should.equal true


