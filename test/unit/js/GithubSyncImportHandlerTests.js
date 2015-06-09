(function() {
  var SandboxedModule, chai, expect, modulePath, should, sinon;

  sinon = require('sinon');

  chai = require('chai');

  should = chai.should();

  expect = chai.expect;

  modulePath = require('path').join(__dirname, '../../../app/js/GithubSyncImportHandler.js');

  SandboxedModule = require('sandboxed-module');

  describe("GithubSyncImportHandler", function() {
    beforeEach(function() {
      this.GithubSyncImportHandler = SandboxedModule.require(modulePath, {
        requires: {
          "../../../../app/js/Features/Project/ProjectCreationHandler": this.ProjectCreationHandler = {},
          "../../../../app/js/Features/Project/ProjectRootDocManager": this.ProjectRootDocManager = {},
          "./GithubSyncApiHandler": this.GithubSyncApiHandler = {}
        }
      });
      return this.callback = sinon.stub();
    });
    return describe("importProject", function() {
      beforeEach(function() {
        this.owner_id = "owner-id-123";
        this.name = "project-name";
        this.repo = "org/repo";
        this.project = {
          _id: this.project_id = "project-id-123"
        };
        this.ProjectCreationHandler.createBlankProject = sinon.stub().callsArgWith(2, null, this.project);
        this.GithubSyncApiHandler.importProject = sinon.stub().callsArg(3);
        this.ProjectRootDocManager.setRootDocAutomatically = sinon.stub().callsArg(1);
        return this.GithubSyncImportHandler.importProject(this.owner_id, this.name, this.repo, this.callback);
      });
      it("should create a project", function() {
        return this.ProjectCreationHandler.createBlankProject.calledWith(this.owner_id, this.name).should.equal(true);
      });
      it("should import the project from github", function() {
        return this.GithubSyncApiHandler.importProject.calledWith(this.project_id, this.owner_id, this.repo).should.equal(true);
      });
      it("should set the root doc", function() {
        return this.ProjectRootDocManager.setRootDocAutomatically.calledWith(this.project_id).should.equal(true);
      });
      return it("should call the callback with the project id", function() {
        return this.callback.calledWith(null, this.project_id).should.equal(true);
      });
    });
  });

}).call(this);
