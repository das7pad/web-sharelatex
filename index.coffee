TemplatesRouter = require "./app/js/TemplatesRouter"
Features = require "../../app/js/infrastructure/Features"


Templates =
	router: TemplatesRouter

	viewIncludes:
		"editorLeftMenu:actions" : "project/editor/_left-menu"


if Features.hasFeature('templates')
	module.exports = Templates
else
	module.exports = {}
