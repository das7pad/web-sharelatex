logger = require 'logger-sharelatex'
marked = require 'marked'
sanitizeHtml = require 'sanitize-html'
ContentfulClient = require '../ContentfulClient'
ErrorController = require '../../../../../app/js/Features/Errors/ErrorController'
CmsHandler = require '../CmsHandler'
ContentParser = require '../ContentParser'

module.exports =

	getContactPage: (req, res, next)->
		if req.query.cms || process.env.CONTENT_PAGES
			# clientType determines which API to use.
			# client is for published data
			# clientPreview is for unpublished data
			clientType = if req.query.preview || req.query.preview == '' then 'clientPreview' else 'client'

			# include is for the depth of the query, for linked data
			cmsQuery = {
				content_type: 'pageContact'
				include: 10
			}

			ContentfulClient[clientType].getEntries(cmsQuery)
				.then (collection) ->
					if collection.items.length == 0 || collection.items?[0]?.sys?.id != '2opS9ghyowsUqa4quOYCmu'
						ErrorController.notFound req, res
					else
						cmsData = collection.items?[0]?.fields
						if cmsData.content
							ContentParser.parseArray(cmsData.content)

						CmsHandler.render(res, 'page/page', cmsData, req.query)
				.catch (err) ->
					next(err)
		else
			ErrorController.notFound req, res
