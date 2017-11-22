GithubSyncRouter = require "./app/js/GithubSyncRouter"
Features = require "../../app/js/infrastructure/Features"

GithubSyncModule =
	router: GithubSyncRouter
	
	viewIncludes:
		"userSettings"   : "user/_settings"
		"editorLeftMenu:sync" : "project/editor/_left-menu"
		"newProjectMenu" : "project/list/_new-project-menu"
	
if Features.hasFeature('github-sync')
	module.exports = GithubSyncModule
else
	module.exports = {}