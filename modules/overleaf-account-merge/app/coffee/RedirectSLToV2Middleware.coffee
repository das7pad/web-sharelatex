Features = require "../../../../app/js/infrastructure/Features"
Settings = require "settings-sharelatex"

module.exports = RedirectSLToV2Middleware = (req, res, next) ->
  # Skip if redirection is disabled
  return next() if !Features.hasFeature('redirect-sl')

  # Preserve whitelisted pages
  if Settings.redirectToV2?.whitelist?
    isWhitelisted = Settings.redirectToV2.whitelist.some (whitelistRegex) ->
      whitelistRegex.test(req.path)

  if isWhitelisted
    next()
  else
    res.redirect("#{Settings.accountMerge.betaHost}#{req.url}")
