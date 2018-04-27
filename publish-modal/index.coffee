Features = require("../../app/js/infrastructure/Features")
PublishModalRouter = require("./app/js/PublishModalRouter")

PublishModalModule =
	router: PublishModalRouter

	viewIncludes:
		"publish:script": "script"
		"publish:button": "button"
		"publish:body": "body"

if Features.hasFeature('publish-modal')
  module.exports = PublishModalModule
else
  module.exports = {}
