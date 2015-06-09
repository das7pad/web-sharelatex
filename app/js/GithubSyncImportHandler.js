(function() {
  var GithubSyncApiHandler, GithubSyncImportHandler, ProjectCreationHandler, ProjectRootDocManager;

  ProjectCreationHandler = require("../../../../app/js/Features/Project/ProjectCreationHandler");

  ProjectRootDocManager = require("../../../../app/js/Features/Project/ProjectRootDocManager");

  GithubSyncApiHandler = require("./GithubSyncApiHandler");

  module.exports = GithubSyncImportHandler = {
    importProject: function(owner_id, name, repo, callback) {
      if (callback == null) {
        callback = function(error, project_id) {};
      }
      return ProjectCreationHandler.createBlankProject(owner_id, name, function(error, project) {
        var project_id;
        if (error != null) {
          return callback(error);
        }
        project_id = project._id.toString();
        return GithubSyncApiHandler.importProject(project_id, owner_id, repo, function(error) {
          if (error != null) {
            return callback(error);
          }
          return ProjectRootDocManager.setRootDocAutomatically(project_id, function(error) {
            if (error != null) {
              return callback(error);
            }
            return callback(null, project_id);
          });
        });
      });
    }
  };

}).call(this);
