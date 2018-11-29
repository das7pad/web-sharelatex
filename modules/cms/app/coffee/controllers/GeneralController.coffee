logger = require 'logger-sharelatex'
ContentfulClient = require '../ContentfulClient'
ContentParser = require '../ContentParser'
ErrorController = require '../../../../../app/js/Features/Errors/ErrorController'
CmsHandler = require '../CmsHandler'
Settings = require 'settings-sharelatex'

module.exports = PageController =

	getPage: (req, res, next)->
		if req.query.cms || Settings.showContentPages
			# clientType determines which API to use.
			# client is for published data
			# clientPreview is for unpublished data
			clientType = if req.query.preview || req.query.preview == '' then 'clientPreview' else 'client'

			# include is for the depth of the query, for linked data
			cmsQuery = {
				content_type: 'page'
				'fields.slug': req.params.slug,
				include: 3
			}

			# need to check fields? below, because if a linked entry was deleted
			# without first unlinking, then there will still be an "entry" for it
			# where it was linked but with no fields
			ContentfulClient[clientType].getEntries(cmsQuery)
				.then (collection) ->
					pageData = collection.items?[0]?.fields
					if !pageData
						ErrorController.notFound req, res
					else
						if pageData.parentPage && !req.params.parent_slug
							# subpages should not be loaded without parent slug
							# for example: /for/_correct_subpage_slug_
							ErrorController.notFound req, res
						else if pageData.parentPage && pageData.parentPage.fields?.slug && req.params.parent_slug != pageData.parentPage.fields?.slug
							# subpages should not be loaded with the wrong parent slug
							# for example: /_wrong_path_/_correct_parent_slug/_correct_subpage_slug_
							ErrorController.notFound req, res
						else
							if pageData.content
								ContentParser.parseArray(pageData.content)

							CmsHandler.render(res, 'page/page', pageData, req.query)
				.catch (err) ->
					next(err)
		else
			ErrorController.notFound req, res
