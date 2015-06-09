(function() {
  var ReferencesApiHandler, referencesUrl, request, settings, _ref;

  settings = require("settings-sharelatex");

  request = require("request");

  referencesUrl = ((_ref = settings.apis.references) != null ? _ref.url : void 0) || "http://localhost:3023";

  module.exports = ReferencesApiHandler = {
    startAuth: function(req, res) {
      var opts, user_id, _ref1, _ref2;
      user_id = (_ref1 = req.session) != null ? (_ref2 = _ref1.user) != null ? _ref2._id : void 0 : void 0;
      opts = {
        method: "get",
        url: "/user/" + user_id + "/mendeley/oauth",
        json: true
      };
      return ReferencesApiHandler.makeRequest(opts, function(err, response, body) {
        console.log(body, Object.keys(body));
        return res.redirect(body.redirect);
      });
    },
    completeAuth: function(req, res) {
      var opts, user_id, _ref1, _ref2;
      user_id = (_ref1 = req.session) != null ? (_ref2 = _ref1.user) != null ? _ref2._id : void 0 : void 0;
      opts = {
        method: "get",
        url: "/user/" + user_id + "/mendeley/tokenexchange",
        qs: req.query
      };
      return ReferencesApiHandler.makeRequest(opts, function(err, response, body) {
        return res.redirect("/user/settings");
      });
    },
    makeRequest: function(opts, callback) {
      opts.url = "" + referencesUrl + opts.url;
      return request(opts, callback);
    }
  };

}).call(this);
