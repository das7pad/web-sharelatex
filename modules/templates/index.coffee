TemplatesRouter = require "./app/js/TemplatesRouter"
Features = require "../../app/js/infrastructure/Features"

Templates =
	router: TemplatesRouter

if Features.hasFeature('publish-templates')
	Templates.viewIncludes =
		"editorLeftMenu:actions" : "project/editor/_left-menu"

module.exports = Templates
