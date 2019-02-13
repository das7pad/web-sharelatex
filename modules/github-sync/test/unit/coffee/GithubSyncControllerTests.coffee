SandboxedModule = require('sandboxed-module')
assert = require('assert')
require('chai').should()
sinon = require('sinon')
modulePath = require('path').join __dirname, '../../../app/js/GithubSyncController.js'

describe 'GithubSyncController', ->
	beforeEach ->
		@user_id = "user-id-123"
		@AuthenticationController =
			getLoggedInUserId: sinon.stub().returns(@user_id)
		@user =
			features:
				github: true
		@UserGetter =
			getUser: sinon.stub().callsArgWith(1, null, @user)
		@GithubSyncController = SandboxedModule.require modulePath, requires:
			'request': @request = sinon.stub()
			'settings-sharelatex': @settings = {}
			'logger-sharelatex': @logger = { log: sinon.stub(), error: sinon.stub() }
			"./GithubSyncApiHandler": @GithubSyncApiHandler = {}
			"./GithubSyncExportHandler": @GithubSyncExportHandler = {}
			"./GithubSyncImportHandler": @GithubSyncImportHandler = {}
			'../../../../app/js/Features/User/UserGetter': @UserGetter
			"../../../../app/js/Features/Authentication/AuthenticationController": @AuthenticationController
			"../../../../app/js/Features/User/UserGetter": @UserGetter

		@settings.apis =
			githubSync:
				url: "http://github-sync.example.com"
		@settings.siteUrl = "http://sharelatex.example.com"

		@req =
			session:
				user:
					_id: @user_id
		@res =
			redirect: sinon.stub()
			header: sinon.stub()
			json: sinon.stub()
			end: sinon.stub()
			setTimeout: sinon.stub()
		@res.status = sinon.stub().returns(@res)

	describe "login", ->
		beforeEach ->
			@loginUrl = "https://github.example.com/login/oauth/authorize?client_id=foo"
			@authUrl = "#{@settings.siteUrl}/github-sync/completeRegistration"
			@GithubSyncApiHandler.getLoginUrl = sinon.stub().callsArgWith(1, null, @loginUrl)

		it "should call fetch the OAuth login URL from the github Sync API", (done) ->
			@res.redirect = =>
				sinon.assert.calledWith(@GithubSyncApiHandler.getLoginUrl, @user_id)
				done()

			@GithubSyncController.login @req, @res

		it "should redirect to the Github OAuth URL", (done) ->
			@res.redirect = (url) =>
				url.should.equal @loginUrl + "&redirect_uri=#{@authUrl}"
				done()

			@GithubSyncController.login @req, @res

		it "should return 403 when the user does not have the Github feature", (done) ->
			@res.sendStatus = (status) =>
				status.should.equal 403
				done()

			@user.features.github = false
			@GithubSyncController.login @req, @res

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

		it "should redirect to the linked confirmation page", ->
			@res.redirect
				.calledWith("/github-sync/linked")
				.should.equal true

	describe "unlink", ->
		beforeEach ->
			@GithubSyncApiHandler.unlink = sinon.stub().callsArg(1)
			@GithubSyncController.unlink @req, @res

		it "should send an unlink request to the github api", ->
			@GithubSyncApiHandler.unlink
				.calledWith(@user_id)
				.should.equal true

		it "should redirect to the settings page", ->
			@res.redirect
				.calledWith("/user/settings")
				.should.equal true

	describe "getUserStatus", ->
		beforeEach ->
			@user = {
				features:
					github: true
			}
			@GithubSyncApiHandler.getUserStatus = sinon.stub().callsArgWith(1, null, @status = { enabled: true })
			@UserGetter.getUser = sinon.stub().callsArgWith(1, null, @user)

		describe "with the github feature available", ->
			beforeEach ->
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
					.calledWith({
						available: true
						enabled: @status.enabled
					})
					.should.equal true

		describe "with the github feature not available", ->
			beforeEach ->
				@user.features.github = false
				@GithubSyncController.getUserStatus @req, @res

			it "should return the status as JSON", ->
				@res.header
					.calledWith("Content-Type", "application/json")
					.should.equal true

				@res.json
					.calledWith({
						available: false
						enabled: false
					})
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

	describe "getUserRepos", ->
		beforeEach ->
			@GithubSyncApiHandler.getUserRepos = sinon.stub().callsArgWith(1, null, @repos = [{full_name: "org/repo"}])
			@GithubSyncController.getUserRepos @req, @res

		it "should get the user details from the github sync api", ->
			@GithubSyncApiHandler.getUserRepos
				.calledWith(@user_id)
				.should.equal true

		it "should return the output as JSON", ->
			@res.header
				.calledWith("Content-Type", "application/json")
				.should.equal true

			@res.json
				.calledWith(@repos)
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

	describe "getProjectUnmergedCommits", ->
		beforeEach ->
			@req.params =
				Project_id: @project_id = "project-id-123"
			@commits = [
				sha: @sha = "mock-sha-123"
				commit:
					message: @message = "Hello world"
					author: @author = { name: "James" }
				extra: "not included in response"
			]
			@GithubSyncApiHandler.getProjectUnmergedCommits = sinon.stub().callsArgWith(1, null, @commits)
			@GithubSyncController.getProjectUnmergedCommits @req, @res

		it "should get the commits from the github api", ->
			@GithubSyncApiHandler.getProjectUnmergedCommits
				.calledWith(@project_id)
				.should.equal true

		it "should send the formatted commits as JSON", ->
			@res.header
				.calledWith("Content-Type", "application/json")
				.should.equal true

			@res.json
				.calledWith([{
					message: @message
					sha: @sha
					author: @author
				}])
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
			@GithubSyncExportHandler.exportProject = sinon.stub().callsArgWith(3, null)
			@GithubSyncController.exportProject @req, @res

		it "should export the project", ->
			@GithubSyncExportHandler.exportProject
				.calledWith(@project_id, @user_id, {
					name: "Test repo"
					description: "Test description"
					org: "sharelatex"
					private: true
				})
				.should.equal true

	describe "importProject", ->
		beforeEach ->
			@req.body =
				projectName: @name = "Project Name"
				repo: @repo = "org/repo"
			@GithubSyncImportHandler.importProject = sinon.stub().callsArgWith(3, null, @project_id = "project-id-123")
			@GithubSyncController.importProject @req, @res

		it "should import the project", ->
			@GithubSyncImportHandler.importProject
				.calledWith(@user_id, @name, @repo)
				.should.equal true

		it "should return the project id to the client", ->
			@res.json
				.calledWith(project_id: @project_id)
				.should.equal true

		it "should set the response timeout to 10 minutes", ->
			@res.setTimeout.calledWith(10 * 60 * 1000).should.equal true

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
