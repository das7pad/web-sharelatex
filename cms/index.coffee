logger = require "logger-sharelatex"
settings = require('settings-sharelatex')


if !settings.overleaf? || !settings.contentful?
	module.exports = {}
else
	module.exports = {
		router: require "./app/js/CmsRouter"
	}
