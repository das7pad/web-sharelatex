Features = require("../../app/js/infrastructure/Features")
PublishModalRouter = require("./app/js/PublishModalRouter")

module.exports =
	router: PublishModalRouter

	assetFiles: ["es/publish-modal.js"]

	viewIncludes:
		"publish:script": "script"
		"publish:button": "button"
		"publish:body": "body"
