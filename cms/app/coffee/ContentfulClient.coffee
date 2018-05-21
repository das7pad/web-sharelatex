settings = require 'settings-sharelatex'
contentful = require 'contentful'

# to do - add caching via host setting

module.exports =
	client: contentful.createClient({
		accessToken: settings.contentful.deliveryToken,
		space: settings.contentful.spaceId
	})

	clientPreview: contentful.createClient({
		accessToken: settings.contentful.previewToken,
		space: settings.contentful.spaceId,
		host: settings.contentful.previewApiHost
	})
