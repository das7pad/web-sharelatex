CmsRouter = require "./app/js/CmsRouter"
logger = require "logger-sharelatex"
settings = require('settings-sharelatex')

cms  =
	router: CmsRouter

if !settings.overleaf?
	module.exports = {}
else
	module.exports = cms
