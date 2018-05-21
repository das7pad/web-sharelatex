logger = require 'logger-sharelatex'
marked = require 'marked'
path = require 'path'
ContentfulClient = require '../ContentfulClient'

page = path.resolve(__dirname, '../../views/page/page')

parseContent = (content) ->
	if content.fields.content
		content.fields.content = marked(content.fields.content)
	else if content.fields.tabs
		content.fields.tabs.map (c) -> parseContent(c)
	else if content.fields.tabContent
		content.fields.tabContent.map (c) -> parseContent(c)
	else if content.fields.quote
		# input is a textarea but still need to parse for line breaks
		content.fields.quote = marked(content.fields.quote)
	else if content.fields.mbData
		content.fields.mbData = JSON.stringify(content.fields.mbData)
	content

module.exports = PageController =

	getPage: (req, res, next)->
		if !req.query.cms
			# Leave `!req.query.cms` until content migration is finished
			ErrorController.notFound res, req
		else
			# clientType determines which API to use.
			# client is for published data
			# clientPreview is for unpublished data
			clientType = if req.query.preview == '' then 'clientPreview' else 'client'
			# pageData.clientType is used to display a "Preview" element in the UI
			pageData = {
				clientType: clientType
			}

			# include is for the depth of the query, for linked data
			cmsQuery = {
				content_type: 'page'
				'fields.slug': req.params.slug,
				include: 3
			}

			ContentfulClient[clientType].getEntries(cmsQuery)
				.then (collection) ->
					if collection.items.length == 0
						# to do - better 404?
						ErrorController.notFound res, req
					else
						[data] = collection.items
						if data.fields.content
							data.fields.content.map (content) -> parseContent(content)
						pageData.data = data.fields
						pageData.meta = pageData.metaDescription
						res.render page, pageData
				.catch (err) ->
					next(err)