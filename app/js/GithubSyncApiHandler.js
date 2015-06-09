(function() {
  var GithubSyncApiHandler, logger, request, settings;

  request = require("request");

  settings = require("settings-sharelatex");

  logger = require("logger-sharelatex");

  module.exports = GithubSyncApiHandler = {
    getLoginUrl: function(user_id, callback) {
      var url;
      if (callback == null) {
        callback = function(error, loginUrl) {};
      }
      url = "" + settings.apis.githubSync.url + "/user/" + user_id + "/loginUrl";
      return GithubSyncApiHandler.apiRequest({
        method: "get",
        url: url,
        json: true
      }, function(error, body) {
        if (error != null) {
          return callback(error);
        }
        return callback(null, body.url);
      });
    },
    doAuth: function(user_id, options, callback) {
      var url;
      if (callback == null) {
        callback = function(error) {};
      }
      url = "" + settings.apis.githubSync.url + "/user/" + user_id + "/completeAuth";
      return GithubSyncApiHandler.apiRequest({
        method: "post",
        url: url,
        json: options
      }, callback);
    },
    unlink: function(user_id, callback) {
      var url;
      if (callback == null) {
        callback = function(error) {};
      }
      url = "" + settings.apis.githubSync.url + "/user/" + user_id + "/unlink";
      return GithubSyncApiHandler.apiRequest({
        method: "delete",
        url: url
      }, callback);
    },
    getUserStatus: function(user_id, callback) {
      var url;
      if (callback == null) {
        callback = function(error, status) {};
      }
      url = "" + settings.apis.githubSync.url + "/user/" + user_id + "/status";
      return GithubSyncApiHandler.apiRequest({
        method: "get",
        url: url,
        json: true
      }, callback);
    },
    getProjectStatus: function(project_id, callback) {
      var url;
      if (callback == null) {
        callback = function(error, status) {};
      }
      url = "" + settings.apis.githubSync.url + "/project/" + project_id + "/status";
      return GithubSyncApiHandler.apiRequest({
        method: "get",
        url: url,
        json: true
      }, callback);
    },
    getProjectUnmergedCommits: function(project_id, callback) {
      var url;
      if (callback == null) {
        callback = function(error, status) {};
      }
      url = "" + settings.apis.githubSync.url + "/project/" + project_id + "/commits/unmerged";
      return GithubSyncApiHandler.apiRequest({
        method: "get",
        url: url,
        json: true
      }, callback);
    },
    getUserLoginAndOrgs: function(user_id, callback) {
      var url;
      if (callback == null) {
        callback = function(error, data) {};
      }
      url = "" + settings.apis.githubSync.url + "/user/" + user_id + "/orgs";
      return GithubSyncApiHandler.apiRequest({
        method: "get",
        url: url,
        json: true
      }, callback);
    },
    getUserRepos: function(user_id, callback) {
      var url;
      if (callback == null) {
        callback = function(error, data) {};
      }
      url = "" + settings.apis.githubSync.url + "/user/" + user_id + "/repos";
      return GithubSyncApiHandler.apiRequest({
        method: "get",
        url: url,
        json: true
      }, callback);
    },
    importProject: function(project_id, owner_id, repo, callback) {
      var url;
      if (callback == null) {
        callback = function(error) {};
      }
      url = "" + settings.apis.githubSync.url + "/project/" + project_id + "/import";
      return GithubSyncApiHandler.apiRequest({
        method: "post",
        url: url,
        json: {
          owner_id: owner_id,
          repo: repo
        }
      }, callback);
    },
    exportProject: function(project_id, owner_id, repo, files, callback) {
      var url;
      if (callback == null) {
        callback = function(error) {};
      }
      url = "" + settings.apis.githubSync.url + "/project/" + project_id + "/export";
      return GithubSyncApiHandler.apiRequest({
        method: "post",
        url: url,
        json: {
          owner_id: owner_id,
          repo: repo,
          files: files
        }
      }, callback);
    },
    mergeProject: function(project_id, options, files, callback) {
      var url;
      if (callback == null) {
        callback = function(error) {};
      }
      url = "" + settings.apis.githubSync.url + "/project/" + project_id + "/merge";
      return GithubSyncApiHandler.apiRequest({
        method: "post",
        url: url,
        json: {
          message: options.message,
          files: files
        }
      }, callback);
    },
    apiRequest: function(options, callback) {
      if (callback == null) {
        callback = function(error, body) {};
      }
      return request(options, function(error, response, body) {
        var message, _ref;
        if (error != null) {
          return callback(error);
        }
        if ((200 <= (_ref = response.statusCode) && _ref < 300)) {
          return callback(null, body);
        } else {
          message = (body != null ? body.error : void 0) || "github-sync api error";
          error = new Error(message);
          error.statusCode = response.statusCode;
          logger.error({
            err: error,
            body: body,
            statusCode: response.statusCode
          }, "github-sync api error");
          return callback(error);
        }
      });
    }
  };

}).call(this);
