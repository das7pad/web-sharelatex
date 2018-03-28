Features = require('../../app/js/infrastructure/Features')

RichTextModule =
  viewIncludes:
    "editor:script": "script"
    "editor:toolbar": "toolbar"
    "editor:body": "body"

if Features.hasFeature('rich-text')
  module.exports = RichTextModule
else
  module.exports = {}
