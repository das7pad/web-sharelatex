(function() {
  var AuthenticationController, GithubSyncApiHandler, GithubSyncController, GithubSyncExportHandler, GithubSyncImportHandler, Path, logger, request, settings;

  request = require("request");

  settings = require("settings-sharelatex");

  logger = require("logger-sharelatex");

  Path = require("path");

  GithubSyncApiHandler = require("./GithubSyncApiHandler");

  GithubSyncExportHandler = require("./GithubSyncExportHandler");

  GithubSyncImportHandler = require("./GithubSyncImportHandler");

  AuthenticationController = require("../../../../app/js/Features/Authentication/AuthenticationController");

  module.exports = GithubSyncController = {
    login: function(req, res, next) {
      var user_id;
      user_id = req.session.user._id;
      return GithubSyncApiHandler.getLoginUrl(user_id, function(error, loginUrl) {
        var authUrl, redirectUrl;
        if (error != null) {
          return next(error);
        }
        authUrl = "" + settings.siteUrl + "/github-sync/completeRegistration";
        redirectUrl = "" + loginUrl + "&redirect_uri=" + authUrl;
        return res.redirect(redirectUrl);
      });
    },
    auth: function(req, res, next) {
      var user_id;
      user_id = req.session.user._id;
      return GithubSyncApiHandler.doAuth(user_id, req.query, function(error) {
        if (error != null) {
          return next(error);
        }
        return res.redirect("/github-sync/linked");
      });
    },
    unlink: function(req, res, next) {
      var user_id;
      user_id = req.session.user._id;
      return GithubSyncApiHandler.unlink(user_id, function(error) {
        if (error != null) {
          return next(error);
        }
        return res.redirect("/user/settings");
      });
    },
    showLinkedPage: function(req, res, next) {
      return res.render(__dirname + "/../views/github/linked");
    },
    getUserStatus: function(req, res, next) {
      var user_id;
      user_id = req.session.user._id;
      return AuthenticationController.getLoggedInUser(req, function(error, user) {
        var available;
        if (error != null) {
          return next(error);
        }
        available = !!user.features.github;
        if (!available) {
          res.header("Content-Type", "application/json");
          return res.json({
            available: false,
            enabled: false
          });
        } else {
          return GithubSyncApiHandler.getUserStatus(user_id, function(error, status) {
            if (error != null) {
              return next(error);
            }
            res.header("Content-Type", "application/json");
            return res.json({
              available: true,
              enabled: status.enabled
            });
          });
        }
      });
    },
    getUserLoginAndOrgs: function(req, res, next) {
      var user_id;
      user_id = req.session.user._id;
      return GithubSyncApiHandler.getUserLoginAndOrgs(user_id, function(error, data) {
        if (error != null) {
          return next(error);
        }
        res.header("Content-Type", "application/json");
        return res.json(data);
      });
    },
    getUserRepos: function(req, res, next) {
      var user_id;
      user_id = req.session.user._id;
      return GithubSyncApiHandler.getUserRepos(user_id, function(error, data) {
        if (error != null) {
          return next(error);
        }
        res.header("Content-Type", "application/json");
        return res.json(data);
      });
    },
    getProjectStatus: function(req, res, next) {
      var project_id;
      project_id = req.params.Project_id;
      return GithubSyncApiHandler.getProjectStatus(project_id, function(error, status) {
        if (error != null) {
          return next(error);
        }
        res.header("Content-Type", "application/json");
        return res.json(status);
      });
    },
    getProjectUnmergedCommits: function(req, res, next) {
      var project_id;
      project_id = req.params.Project_id;
      return GithubSyncApiHandler.getProjectUnmergedCommits(project_id, function(error, commits) {
        if (error != null) {
          return next(error);
        }
        res.header("Content-Type", "application/json");
        return res.json(commits.map(function(c) {
          return {
            message: c.commit.message,
            author: c.commit.author,
            sha: c.sha
          };
        }));
      });
    },
    importProject: function(req, res, next) {
      var projectName, repo, user_id, _ref;
      user_id = req.session.user._id;
      projectName = (_ref = req.body.projectName) != null ? _ref.trim() : void 0;
      repo = req.body.repo;
      return GithubSyncImportHandler.importProject(user_id, projectName, repo, function(error, project_id) {
        if (error != null) {
          return next(error);
        }
        res.header("Content-Type", "application/json");
        return res.json({
          project_id: project_id
        });
      });
    },
    exportProject: function(req, res, next) {
      var description, name, org, priv, project_id, _ref;
      project_id = req.params.Project_id;
      _ref = req.body, name = _ref.name, description = _ref.description, org = _ref.org;
      priv = req.body["private"];
      return GithubSyncExportHandler.exportProject(project_id, {
        name: name,
        description: description,
        org: org,
        "private": priv
      }, function(error) {
        if (error != null) {
          return GithubSyncController._reportError(error, req, res, next);
        }
        return res.status(200).end();
      });
    },
    mergeProject: function(req, res, next) {
      var message, project_id;
      project_id = req.params.Project_id;
      message = req.body.message;
      return GithubSyncExportHandler.mergeProject(project_id, {
        message: message
      }, function(error) {
        if (error != null) {
          return GithubSyncController._reportError(error, req, res, next);
        }
        return res.status(200).end();
      });
    },
    _reportError: function(error, req, res, next) {
      var _ref;
      if ((error.statusCode != null) && (400 <= (_ref = error.statusCode) && _ref < 500)) {
        res.status(error.statusCode);
        res.header("Content-Type", "application/json");
        return res.json({
          error: error.message
        });
      } else {
        return next(error);
      }
    }
  };

}).call(this);
