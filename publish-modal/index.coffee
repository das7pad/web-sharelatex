Features = require('../../app/js/infrastructure/Features')

PublishModalModule =
  viewIncludes:
    "publish:script": "script"
    "publish:button": "button"
    "publish:body": "body"

if Features.hasFeature('publish-modal')
  module.exports = PublishModalModule
else
  module.exports = {}
