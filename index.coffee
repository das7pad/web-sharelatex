ReferencesRouter = require "./app/js/ReferencesRouter"

module.exports = References =
	router: ReferencesRouter
	
	viewIncludes:
		"userSettings"   : "user/_settings"
		"editorLeftMenu:sync" : "project/editor/_left-menu"
	
