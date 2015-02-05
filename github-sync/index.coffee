GithubSyncRouter = require "./app/js/GithubSyncRouter"

module.exports = GithubSync =
	router: GithubSyncRouter
	
	viewIncludes:
		"userSettings"   : "user/_settings"
		"editorLeftMenu:sync" : "project/editor/_left-menu"
		"newProjectMenu" : "project/list/_new-project-menu"
	
