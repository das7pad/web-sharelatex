(function() {
  var GithubSyncApiHandler, GithubSyncMiddlewear, logger;

  GithubSyncApiHandler = require("./GithubSyncApiHandler");

  logger = require("logger-sharelatex");

  module.exports = GithubSyncMiddlewear = {
    injectUserSettings: function(req, res, next) {
      var user_id;
      user_id = req.session.user._id;
      return GithubSyncApiHandler.getUserStatus(user_id, function(error, status) {
        logger.log({
          status: status,
          enabled: status != null ? status.enabled : void 0
        }, "got github status");
        if (error != null) {
          logger.error({
            err: error,
            user_id: user_id
          }, "error getting github sync status");
        }
        res.locals.github = {
          error: !!error,
          enabled: status != null ? status.enabled : void 0
        };
        return next();
      });
    }
  };

}).call(this);
