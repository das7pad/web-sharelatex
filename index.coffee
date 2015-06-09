MendeleyRouter = require "./app/js/MendeleyRouter"

module.exports = GithubSync =
	router: MendeleyRouter
	
	viewIncludes:
		"userSettings"   : "user/_settings"
		"editorLeftMenu:sync" : "project/editor/_left-menu"
		"newProjectMenu" : "project/list/_new-project-menu"
	
