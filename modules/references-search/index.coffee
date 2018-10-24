logger = require('logger-sharelatex')
ReferencesSearchRouter = require './app/js/ReferencesSearchRouter'

module.exports = ReferencesSearch =
	router: ReferencesSearchRouter

	viewIncludes:
		"editorLeftMenu:actions": "project/editor/_left-menu"

	init: () ->
