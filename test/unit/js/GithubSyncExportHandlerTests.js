(function() {
  var SandboxedModule, chai, expect, modulePath, should, sinon;

  sinon = require('sinon');

  chai = require('chai');

  should = chai.should();

  expect = chai.expect;

  modulePath = require('path').join(__dirname, '../../../app/js/GithubSyncExportHandler.js');

  SandboxedModule = require('sandboxed-module');

  describe("GithubSyncExportHandler", function() {
    beforeEach(function() {
      this.GithubSyncExportHandler = SandboxedModule.require(modulePath, {
        requires: {
          "../../../../app/js/Features/Project/ProjectEntityHandler": this.ProjectEntityHandler = {},
          "../../../../app/js/Features/DocumentUpdater/DocumentUpdaterHandler": this.DocumentUpdaterHandler = {},
          "../../../../app/js/models/Project": {
            Project: this.Project = {}
          },
          "./GithubSyncApiHandler": this.GithubSyncApiHandler = {},
          "settings-sharelatex": this.settings = {
            apis: {
              filestore: {
                url: "filestore.example.com"
              },
              githubSync: {
                url: "github-sync.example.com"
              }
            }
          }
        }
      });
      this.project_id = "project-id";
      return this.callback = sinon.stub();
    });
    describe("exportProject", function() {
      beforeEach(function() {
        this.owner_id = "owner-id-123";
        this.name = "mock-name";
        this.description = "Repository description";
        this.Project.findById = sinon.stub().callsArgWith(2, null, this.project = {
          owner_ref: this.owner_id
        });
        this.GithubSyncApiHandler.exportProject = sinon.stub().callsArg(4);
        this.GithubSyncExportHandler._buildFileList = sinon.stub().callsArgWith(1, null, this.files = ["mock-files"]);
        this.DocumentUpdaterHandler.flushProjectToMongo = sinon.stub().callsArg(1);
        return this.GithubSyncExportHandler.exportProject(this.project_id, {
          name: this.name,
          description: this.description
        }, this.callback);
      });
      it("should look up the project owner", function() {
        return this.Project.findById.calledWith(this.project_id, {
          owner_ref: 1
        }).should.equal(true);
      });
      it("should flush the document to Mongo", function() {
        return this.DocumentUpdaterHandler.flushProjectToMongo.calledWith(this.project_id).should.equal(true);
      });
      it("should get the project file list", function() {
        return this.GithubSyncExportHandler._buildFileList.calledWith(this.project_id).should.equal(true);
      });
      return it("should send an export request to the Github API", function() {
        return this.GithubSyncApiHandler.exportProject.calledWith(this.project_id, this.owner_id, {
          name: this.name,
          description: this.description
        }, this.files).should.equal(true);
      });
    });
    describe("mergeProject", function() {
      beforeEach(function() {
        this.owner_id = "owner-id-123";
        this.message = "Commit message";
        this.GithubSyncApiHandler.mergeProject = sinon.stub().callsArg(3);
        this.GithubSyncExportHandler._buildFileList = sinon.stub().callsArgWith(1, null, this.files = ["mock-files"]);
        this.DocumentUpdaterHandler.flushProjectToMongo = sinon.stub().callsArg(1);
        return this.GithubSyncExportHandler.mergeProject(this.project_id, {
          message: this.message
        }, this.callback);
      });
      it("should flush the document to Mongo", function() {
        return this.DocumentUpdaterHandler.flushProjectToMongo.calledWith(this.project_id).should.equal(true);
      });
      it("should get the project file list", function() {
        return this.GithubSyncExportHandler._buildFileList.calledWith(this.project_id).should.equal(true);
      });
      return it("should send a merge request to the Github API", function() {
        return this.GithubSyncApiHandler.mergeProject.calledWith(this.project_id, {
          message: this.message
        }, this.files).should.equal(true);
      });
    });
    return describe("_buildFileList", function() {
      beforeEach(function() {
        this.docs = {
          "/main.tex": this.doc_1 = {
            name: "main.tex",
            _id: "mock-doc-id-1",
            lines: ["Hello", "world"],
            rev: 42
          },
          "/chapters/chapter1.tex": this.doc_2 = {
            name: "chapter1.tex",
            _id: "mock-doc-id-2",
            rev: 24,
            lines: ["Chapter 1"]
          }
        };
        this.files = {
          "/images/image.png": this.file_1 = {
            name: "image.png",
            _id: "mock-file-id-1",
            created: new Date(),
            rev: 0
          }
        };
        this.ProjectEntityHandler.getAllDocs = sinon.stub().callsArgWith(1, null, this.docs);
        this.ProjectEntityHandler.getAllFiles = sinon.stub().callsArgWith(1, null, this.files);
        return this.GithubSyncExportHandler._buildFileList(this.project_id, this.callback);
      });
      return it("should return the list of files", function() {
        return this.callback.calledWith(null, [
          {
            path: "main.tex",
            content: this.doc_1.lines.join("\n"),
            id: "mock-doc-id-1",
            rev: 42
          }, {
            path: "chapters/chapter1.tex",
            content: this.doc_2.lines.join("\n"),
            id: "mock-doc-id-2",
            rev: 24
          }, {
            path: "images/image.png",
            url: "" + this.settings.apis.filestore.url + "/project/" + this.project_id + "/file/" + this.file_1._id,
            id: "mock-file-id-1",
            rev: 0
          }
        ]).should.equal(true);
      });
    });
  });

}).call(this);
