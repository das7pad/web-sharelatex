Features = require("../../app/js/infrastructure/Features")
PublishModalRouter = require("./app/js/PublishModalRouter")

module.exports =
	router: PublishModalRouter

	viewIncludes:
		"publish:script": "script"
		"publish:button": "button"
		"publish:body": "body"
