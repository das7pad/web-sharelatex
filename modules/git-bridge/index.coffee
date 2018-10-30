GitBridgeRouter = require "./app/js/GitBridgeRouter"
logger = require "logger-sharelatex"


GitBridgeModule =
	router: GitBridgeRouter

	viewIncludes:
		'editorLeftMenu:sync': 'project/editor/_left-menu'


if Features.hasFeature('git-bridge')
	module.exports = GitBridgeModule
else
	module.exports = {}
