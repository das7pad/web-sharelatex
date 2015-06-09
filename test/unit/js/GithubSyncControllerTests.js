(function() {
  var SandboxedModule, assert, modulePath, sinon;

  SandboxedModule = require('sandboxed-module');

  assert = require('assert');

  require('chai').should();

  sinon = require('sinon');

  modulePath = require('path').join(__dirname, '../../../app/js/GithubSyncController.js');

  describe('GithubSyncController', function() {
    beforeEach(function() {
      this.GithubSyncController = SandboxedModule.require(modulePath, {
        requires: {
          'request': this.request = sinon.stub(),
          'settings-sharelatex': this.settings = {},
          'logger-sharelatex': this.logger = {
            log: sinon.stub(),
            error: sinon.stub()
          },
          "./GithubSyncApiHandler": this.GithubSyncApiHandler = {},
          "./GithubSyncExportHandler": this.GithubSyncExportHandler = {},
          "./GithubSyncImportHandler": this.GithubSyncImportHandler = {},
          "../../../../app/js/Features/Authentication/AuthenticationController": this.AuthenticationController = {}
        }
      });
      this.settings.apis = {
        githubSync: {
          url: "http://github-sync.example.com"
        }
      };
      this.settings.siteUrl = "http://sharelatex.example.com";
      this.user_id = "user-id-123";
      this.req = {
        session: {
          user: {
            _id: this.user_id
          }
        }
      };
      this.res = {
        redirect: sinon.stub(),
        header: sinon.stub(),
        json: sinon.stub(),
        end: sinon.stub()
      };
      return this.res.status = sinon.stub().returns(this.res);
    });
    describe("login", function() {
      beforeEach(function() {
        this.loginUrl = "https://github.example.com/login/oauth/authorize?client_id=foo";
        this.authUrl = "" + this.settings.siteUrl + "/github-sync/completeRegistration";
        this.GithubSyncApiHandler.getLoginUrl = sinon.stub().callsArgWith(1, null, this.loginUrl);
        return this.GithubSyncController.login(this.req, this.res);
      });
      it("should call fetch the OAuth login URL from the github Sync API", function() {
        return this.GithubSyncApiHandler.getLoginUrl.calledWith(this.user_id).should.equal(true);
      });
      return it("should redirect to the Github OAuth URL", function() {
        return this.res.redirect.calledWith(this.loginUrl + ("&redirect_uri=" + this.authUrl)).should.equal(true);
      });
    });
    describe("auth", function() {
      beforeEach(function() {
        this.req.query = {
          code: "github-code",
          state: "github-csrf-token"
        };
        this.GithubSyncApiHandler.doAuth = sinon.stub().callsArg(2);
        return this.GithubSyncController.auth(this.req, this.res);
      });
      it("should call send the request to the github sync api", function() {
        return this.GithubSyncApiHandler.doAuth.calledWith(this.user_id, this.req.query).should.equal(true);
      });
      return it("should redirect to the linked confirmation page", function() {
        return this.res.redirect.calledWith("/github-sync/linked").should.equal(true);
      });
    });
    describe("unlink", function() {
      beforeEach(function() {
        this.GithubSyncApiHandler.unlink = sinon.stub().callsArg(1);
        return this.GithubSyncController.unlink(this.req, this.res);
      });
      it("should send an unlink request to the github api", function() {
        return this.GithubSyncApiHandler.unlink.calledWith(this.user_id).should.equal(true);
      });
      return it("should redirect to the settings page", function() {
        return this.res.redirect.calledWith("/user/settings").should.equal(true);
      });
    });
    describe("getUserStatus", function() {
      beforeEach(function() {
        this.user = {
          features: {
            github: true
          }
        };
        this.GithubSyncApiHandler.getUserStatus = sinon.stub().callsArgWith(1, null, this.status = {
          enabled: true
        });
        return this.AuthenticationController.getLoggedInUser = sinon.stub().callsArgWith(1, null, this.user);
      });
      describe("with the github feature available", function() {
        beforeEach(function() {
          return this.GithubSyncController.getUserStatus(this.req, this.res);
        });
        it("should get the user status from the github sync api", function() {
          return this.GithubSyncApiHandler.getUserStatus.calledWith(this.user_id).should.equal(true);
        });
        return it("should return the status as JSON", function() {
          this.res.header.calledWith("Content-Type", "application/json").should.equal(true);
          return this.res.json.calledWith({
            available: true,
            enabled: this.status.enabled
          }).should.equal(true);
        });
      });
      return describe("with the github feature not available", function() {
        beforeEach(function() {
          this.user.features.github = false;
          return this.GithubSyncController.getUserStatus(this.req, this.res);
        });
        return it("should return the status as JSON", function() {
          this.res.header.calledWith("Content-Type", "application/json").should.equal(true);
          return this.res.json.calledWith({
            available: false,
            enabled: false
          }).should.equal(true);
        });
      });
    });
    describe("getUserLoginAndOrgs", function() {
      beforeEach(function() {
        this.GithubSyncApiHandler.getUserLoginAndOrgs = sinon.stub().callsArgWith(1, null, this.data = {
          user: {
            login: "jpallen"
          },
          orgs: []
        });
        return this.GithubSyncController.getUserLoginAndOrgs(this.req, this.res);
      });
      it("should get the user details from the github sync api", function() {
        return this.GithubSyncApiHandler.getUserLoginAndOrgs.calledWith(this.user_id).should.equal(true);
      });
      return it("should return the output as JSON", function() {
        this.res.header.calledWith("Content-Type", "application/json").should.equal(true);
        return this.res.json.calledWith(this.data).should.equal(true);
      });
    });
    describe("getUserRepos", function() {
      beforeEach(function() {
        this.GithubSyncApiHandler.getUserRepos = sinon.stub().callsArgWith(1, null, this.repos = [
          {
            full_name: "org/repo"
          }
        ]);
        return this.GithubSyncController.getUserRepos(this.req, this.res);
      });
      it("should get the user details from the github sync api", function() {
        return this.GithubSyncApiHandler.getUserRepos.calledWith(this.user_id).should.equal(true);
      });
      return it("should return the output as JSON", function() {
        this.res.header.calledWith("Content-Type", "application/json").should.equal(true);
        return this.res.json.calledWith(this.repos).should.equal(true);
      });
    });
    describe("getProjectStatus", function() {
      beforeEach(function() {
        this.req.params = {
          Project_id: this.project_id = "project-id-123"
        };
        this.GithubSyncApiHandler.getProjectStatus = sinon.stub().callsArgWith(1, null, this.status = {
          enabled: true
        });
        return this.GithubSyncController.getProjectStatus(this.req, this.res);
      });
      it("should get the project status from the github sync api", function() {
        return this.GithubSyncApiHandler.getProjectStatus.calledWith(this.project_id).should.equal(true);
      });
      return it("should return the status as JSON", function() {
        this.res.header.calledWith("Content-Type", "application/json").should.equal(true);
        return this.res.json.calledWith(this.status).should.equal(true);
      });
    });
    describe("getProjectUnmergedCommits", function() {
      beforeEach(function() {
        this.req.params = {
          Project_id: this.project_id = "project-id-123"
        };
        this.commits = [
          {
            sha: this.sha = "mock-sha-123",
            commit: {
              message: this.message = "Hello world",
              author: this.author = {
                name: "James"
              }
            },
            extra: "not included in response"
          }
        ];
        this.GithubSyncApiHandler.getProjectUnmergedCommits = sinon.stub().callsArgWith(1, null, this.commits);
        return this.GithubSyncController.getProjectUnmergedCommits(this.req, this.res);
      });
      it("should get the commits from the github api", function() {
        return this.GithubSyncApiHandler.getProjectUnmergedCommits.calledWith(this.project_id).should.equal(true);
      });
      return it("should send the formatted commits as JSON", function() {
        this.res.header.calledWith("Content-Type", "application/json").should.equal(true);
        return this.res.json.calledWith([
          {
            message: this.message,
            sha: this.sha,
            author: this.author
          }
        ]).should.equal(true);
      });
    });
    describe("exportProject", function() {
      beforeEach(function() {
        this.req.params = {
          Project_id: this.project_id = "project-id-123"
        };
        this.req.body = {
          name: "Test repo",
          description: "Test description",
          org: "sharelatex",
          "private": true
        };
        this.GithubSyncExportHandler.exportProject = sinon.stub().callsArgWith(2, null);
        return this.GithubSyncController.exportProject(this.req, this.res);
      });
      return it("should export the project", function() {
        return this.GithubSyncExportHandler.exportProject.calledWith(this.project_id, {
          name: "Test repo",
          description: "Test description",
          org: "sharelatex",
          "private": true
        }).should.equal(true);
      });
    });
    describe("importProject", function() {
      beforeEach(function() {
        this.req.body = {
          projectName: this.name = "Project Name",
          repo: this.repo = "org/repo"
        };
        this.GithubSyncImportHandler.importProject = sinon.stub().callsArgWith(3, null, this.project_id = "project-id-123");
        return this.GithubSyncController.importProject(this.req, this.res);
      });
      it("should import the project", function() {
        return this.GithubSyncImportHandler.importProject.calledWith(this.user_id, this.name, this.repo).should.equal(true);
      });
      return it("should return the project id to the client", function() {
        return this.res.json.calledWith({
          project_id: this.project_id
        }).should.equal(true);
      });
    });
    return describe("mergeProject", function() {
      beforeEach(function() {
        this.req.params = {
          Project_id: this.project_id = "project-id-123"
        };
        this.req.body = {
          message: "Test message"
        };
        this.GithubSyncExportHandler.mergeProject = sinon.stub().callsArgWith(2, null);
        return this.GithubSyncController.mergeProject(this.req, this.res);
      });
      return it("should merge the project", function() {
        return this.GithubSyncExportHandler.mergeProject.calledWith(this.project_id, {
          message: "Test message"
        }).should.equal(true);
      });
    });
  });

}).call(this);
