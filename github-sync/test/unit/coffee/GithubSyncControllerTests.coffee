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
			"./GithubSyncExportHandler": @GithubSyncExportHandler = {}

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
			header: sinon.stub()
			json: sinon.stub()
			end: sinon.stub()
		@res.status = sinon.stub().returns(@res)

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

	describe "getUserStatus", ->
		beforeEach ->
			@GithubSyncApiHandler.getUserStatus = sinon.stub().callsArgWith(1, null, @status = { enabled: true })
			@GithubSyncController.getUserStatus @req, @res
			
		it "should get the user status from the github sync api", ->
			@GithubSyncApiHandler.getUserStatus
				.calledWith(@user_id)
				.should.equal true
				
		it "should return the status as JSON", ->
			@res.header
				.calledWith("Content-Type", "application/json")
				.should.equal true
				
			@res.json
				.calledWith(@status)
				.should.equal true

	describe "getUserLoginAndOrgs", ->
		beforeEach ->
			@GithubSyncApiHandler.getUserLoginAndOrgs = sinon.stub().callsArgWith(1, null, @data = { user: { login: "jpallen" }, orgs: [] })
			@GithubSyncController.getUserLoginAndOrgs @req, @res
			
		it "should get the user details from the github sync api", ->
			@GithubSyncApiHandler.getUserLoginAndOrgs
				.calledWith(@user_id)
				.should.equal true
				
		it "should return the output as JSON", ->
			@res.header
				.calledWith("Content-Type", "application/json")
				.should.equal true
				
			@res.json
				.calledWith(@data)
				.should.equal true

	describe "getProjectStatus", ->
		beforeEach ->
			@req.params =
				Project_id: @project_id = "project-id-123"
			@GithubSyncApiHandler.getProjectStatus = sinon.stub().callsArgWith(1, null, @status = { enabled: true })
			@GithubSyncController.getProjectStatus @req, @res
			
		it "should get the project status from the github sync api", ->
			@GithubSyncApiHandler.getProjectStatus
				.calledWith(@project_id)
				.should.equal true
				
		it "should return the status as JSON", ->
			@res.header
				.calledWith("Content-Type", "application/json")
				.should.equal true
				
			@res.json
				.calledWith(@status)
				.should.equal true
				
	describe "exportProject", ->
		beforeEach ->
			@req.params =
				Project_id: @project_id = "project-id-123"
			@req.body =
				name: "Test repo"
				description: "Test description"
				org: "sharelatex"
				private: true
			@GithubSyncExportHandler.exportProject = sinon.stub().callsArgWith(2, null)
			@GithubSyncController.exportProject @req, @res
			
		it "should export the project", ->
			@GithubSyncExportHandler.exportProject
				.calledWith(@project_id, {
					name: "Test repo"
					description: "Test description"
					org: "sharelatex"
					private: true
				})
				.should.equal true
				
	describe "mergeProject", ->
		beforeEach ->
			@req.params =
				Project_id: @project_id = "project-id-123"
			@req.body =
				message: "Test message"
			@GithubSyncExportHandler.mergeProject = sinon.stub().callsArgWith(2, null)
			@GithubSyncController.mergeProject @req, @res
			
		it "should merge the project", ->
			@GithubSyncExportHandler.mergeProject
				.calledWith(@project_id, {
					message: "Test message"
				})
				.should.equal true

