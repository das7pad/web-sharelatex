GitBridgeRouter = require "./app/js/GitBridgeRouter"
logger = require "logger-sharelatex"

module.exports = GitBridge =
	router: GitBridgeRouter

	viewIncludes:
		'editorLeftMenu:sync': 'project/editor/_left-menu'
