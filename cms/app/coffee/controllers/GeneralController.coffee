logger = require 'logger-sharelatex'
marked = require 'marked'
ContentfulClient = require '../ContentfulClient'
ErrorController = require '../../../../../app/js/Features/Errors/ErrorController'
CmsHandler = require '../CmsHandler'

parseContent = (content) ->
	# Data easier to use in pug template
	content.type = content.sys?.contentType?.sys?.id
	
	if content.type == 'buttonOtherPage'
		if content.fields?.linkTo?.sys?.contentType?.sys?.id == 'pageAbout'
			# slug will be undefined for the about page, 
			# because we don't add this as an input the CMS
			content.href = '/about'
		else if content.fields?.linkTo?.sys?.contentType?.sys?.id == 'blogPost'
			# to do? Should we add the blog path to a setting,
			# so that this path isn't hard coded here and above for 'about'
			content.href = '/blog/' + content.fields.linkTo.fields.slug 
		else if content.fields?.linkTo?.sys?.contentType?.sys?.id == 'page'
			content.href = '/' + content.fields.linkTo.fields.path + '/' + content.fields.linkTo.fields.slug 

	# Parse markdown and stringify JSON
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
			ErrorController.notFound req, res
		else
			# clientType determines which API to use.
			# client is for published data
			# clientPreview is for unpublished data
			clientType = if req.query.preview == '' then 'clientPreview' else 'client'

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
						ErrorController.notFound req, res
					else
						cmsData = collection.items?[0]?.fields
						if cmsData.content
							cmsData.content.map (content, index) ->
								newRow = false # for the grid layout
								if content && content.fields
									# Must check for fields, because an entry could have been added, but with no fields added
									content = parseContent(content)
									# Grid layout
									# new row when: 
									# no index-1
									# index-1 is full width
									# index-1 and index-2 are half width
									if (!content.fields.halfWidth) || 
									(index == 0) || 
									(cmsData.content[index-1] and !cmsData.content[index-1].fields.halfWidth) || 
									(cmsData.content[index-1] and cmsData.content[index-2] and cmsData.content[index-1].fields.halfWidth and cmsData.content[index-2].fields.halfWidth)
										newRow = true
									content.newRow = newRow
									content

						CmsHandler.render(res, 'page/page', cmsData, req.query)
				.catch (err) ->
					next(err)

