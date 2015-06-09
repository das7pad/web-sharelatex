(function() {
  var MendeleyAuthHandler, UserUpdater, logger, oauth2, redirectUri, request, settings;

  oauth2 = require('simple-oauth2')({
    site: 'https://api.mendeley.com',
    clientID: "1486",
    clientSecret: "NtITTocaolem4FSt"
  });

  request = require("request");

  settings = require("settings-sharelatex");

  logger = require("logger-sharelatex");

  redirectUri = settings.siteUrl + '/mendeley/oauth/token-exchange';

  UserUpdater = require("../../../../app/js/Features/User/UserUpdater");

  module.exports = MendeleyAuthHandler = {
    startAuth: function(req, res) {
      var authorizationUri;
      authorizationUri = oauth2.authCode.authorizeURL({
        redirect_uri: redirectUri,
        scope: 'all'
      });
      logger.log({
        authorizationUri: authorizationUri
      }, 'oauth started, redirecting to');
      return res.redirect(authorizationUri);
    },
    tokenExchange: function(req, res, next) {
      var code;
      code = req.query.code;
      logger.log({
        code: code
      }, 'Starting token exchange');
      return oauth2.authCode.getToken({
        redirect_uri: redirectUri,
        code: code
      }, function(err, result) {
        var update, _ref, _ref1, _ref2, _ref3;
        if (err) {
          logger.err({
            err: err
          }, 'error exchanging mendeley tokens');
          res.redirect('/logout');
        } else {
          update = {
            $set: {
              mendeley: {
                access_token: result.access_token,
                refresh_token: result.refresh_token
              }
            }
          };
          console.log(result, "resultttt", (_ref = req.session) != null ? (_ref1 = _ref.user) != null ? _ref1._id : void 0 : void 0, update);
          UserUpdater.updateUser((_ref2 = req.session) != null ? (_ref3 = _ref2.user) != null ? _ref3._id : void 0 : void 0, update, function(err) {
            if (err != null) {
              logger.err({
                err: err,
                result: result
              }, "error setting mendeley info on user");
            }
            return res.redirect('/bibtex');
          });
        }
      });
    }
  };

}).call(this);
