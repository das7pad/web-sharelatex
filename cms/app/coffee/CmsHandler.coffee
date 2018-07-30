
path = require 'path'

module.exports =
	render: (res, page, data, reqQuery) ->
		pagePath = path.resolve(__dirname, '../../app/views/' + page)

		# Query param data
		data.preview = reqQuery?.preview?
		# Metadata
		if page == 'blog/blog'
			data.metadata = {
				fields: {
					title: 'Blog'
				}
			}

		if data.metadata && data.metadata.fields
			data.metadata = data.metadata.fields
			# keywords
			if data.metadata.keywords
				# keywords are stored as an array on the CMS
				data.metadata.keywords = data.metadata.keywords.join(',')

			# default values
			if data.metadata.image
				if !data.metadata.twitterImage
					data.metadata.twitterImage = data.metadata.image
				if !data.metadata.openGraphImage
					data.metadata.openGraphImage = data.metadata.image
			if data.metadata.description
				if !data.metadata.twitterDescription
					data.metadata.twitterDescription = data.metadata.description
				if !data.metadata.openGraphDescription
					data.metadata.openGraphDescription = data.metadata.description
		res.render pagePath, data