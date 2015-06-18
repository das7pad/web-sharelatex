MendeleyRouter = require "./app/js/MendeleyRouter"

module.exports = Mendeley =
	router: MendeleyRouter
	
	viewIncludes:
		"userSettings"   : "user/_settings"
		"editorLeftMenu:sync" : "project/editor/_left-menu"
	
