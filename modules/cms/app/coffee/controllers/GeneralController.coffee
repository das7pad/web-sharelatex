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

			ContentfulClient[clientType].getEntries(cmsQuery)
				.then (collection) ->
					if collection.items.length == 0
						# to do - better 404?
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

