(function() {
  var AuthenticationController, MendeleyAuthHandler, ReferencesApiHandler;

  AuthenticationController = require("../../../../app/js/Features/Authentication/AuthenticationController");

  MendeleyAuthHandler = require("./MendeleyAuthHandler");

  ReferencesApiHandler = require("./ReferencesApiHandler");

  module.exports = {
    apply: function(app) {
      app.get('/mendeley/oauth', AuthenticationController.requireLogin(), ReferencesApiHandler.startAuth);
      return app.get('/mendeley/oauth/token-exchange', AuthenticationController.requireLogin(), ReferencesApiHandler.completeAuth);
    }
  };

}).call(this);
