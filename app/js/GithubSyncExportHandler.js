(function() {
  var DocumentUpdaterHandler, GithubSyncApiHandler, GithubSyncExportHandler, Project, ProjectEntityHandler, settings;

  ProjectEntityHandler = require("../../../../app/js/Features/Project/ProjectEntityHandler");

  DocumentUpdaterHandler = require("../../../../app/js/Features/DocumentUpdater/DocumentUpdaterHandler");

  Project = require("../../../../app/js/models/Project").Project;

  GithubSyncApiHandler = require("./GithubSyncApiHandler");

  settings = require("settings-sharelatex");

  module.exports = GithubSyncExportHandler = {
    exportProject: function(project_id, options, callback) {
      if (callback == null) {
        callback = function(error) {};
      }
      return Project.findById(project_id, {
        owner_ref: 1
      }, function(error, project) {
        if (error != null) {
          return callback(error);
        }
        return DocumentUpdaterHandler.flushProjectToMongo(project_id, function(error) {
          if (error != null) {
            return callback(error);
          }
          return GithubSyncExportHandler._buildFileList(project_id, function(error, files) {
            if (error != null) {
              return callback(error);
            }
            return GithubSyncApiHandler.exportProject(project_id, project.owner_ref, options, files, callback);
          });
        });
      });
    },
    mergeProject: function(project_id, options, callback) {
      if (callback == null) {
        callback = function(error) {};
      }
      return DocumentUpdaterHandler.flushProjectToMongo(project_id, function(error) {
        if (error != null) {
          return callback(error);
        }
        return GithubSyncExportHandler._buildFileList(project_id, function(error, files) {
          if (error != null) {
            return callback(error);
          }
          return GithubSyncApiHandler.mergeProject(project_id, options, files, callback);
        });
      });
    },
    _buildFileList: function(project_id, callback) {
      var fileList;
      if (callback == null) {
        callback = function(error, files) {};
      }
      fileList = [];
      return ProjectEntityHandler.getAllDocs(project_id, function(error, docs) {
        if (docs == null) {
          docs = {};
        }
        if (error != null) {
          return callback(error);
        }
        return ProjectEntityHandler.getAllFiles(project_id, function(error, files) {
          var doc, file, path;
          if (files == null) {
            files = {};
          }
          if (error != null) {
            return callback(error);
          }
          for (path in docs) {
            doc = docs[path];
            fileList.push({
              path: path.replace(/^\//, ""),
              content: doc.lines.join("\n"),
              id: doc._id.toString(),
              rev: doc.rev
            });
          }
          for (path in files) {
            file = files[path];
            fileList.push({
              path: path.replace(/^\//, ""),
              url: "" + settings.apis.filestore.url + "/project/" + project_id + "/file/" + file._id,
              id: file._id.toString(),
              rev: file.rev
            });
          }
          return callback(null, fileList);
        });
      });
    }
  };

}).call(this);
