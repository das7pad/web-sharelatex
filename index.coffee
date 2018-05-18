TemplatesRouter = require "./app/js/TemplatesRouter"
Features = require "../../app/js/infrastructure/Features"

Templates =
	# Need to keep this in v2 to keep the end point to open a v1 template
	router: TemplatesRouter

if Features.hasFeature('templates')
	# Don't show the templates published modal in v2
	Templates.viewIncludes =
		"editorLeftMenu:actions" : "project/editor/_left-menu"

module.exports = Templates