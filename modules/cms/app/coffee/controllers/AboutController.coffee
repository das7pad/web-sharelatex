logger = require 'logger-sharelatex'
marked = require 'marked'
sanitizeHtml = require 'sanitize-html'
ContentfulClient = require '../ContentfulClient'
ContentParser = require '../ContentParser'
ErrorController = require '../../../../../app/js/Features/Errors/ErrorController'
CmsHandler = require '../CmsHandler'
Settings = require 'settings-sharelatex'

sanitizeOptions = if Settings?.modules?.sanitize?.options? then Settings.modules.sanitize.options else sanitizeHtml.defaults

module.exports =

	getPage: (req, res, next)->
		if req.query.cms || Settings.showContentPages
			# clientType determines which API to use.
			# client is for published data
			# clientPreview is for unpublished data
			clientType = if req.query.preview || req.query.preview == '' then 'clientPreview' else 'client'

			# include is for the depth of the query, for linked data
			cmsQuery = {
				content_type: 'pageAbout'
				include: 10
			}

			ContentfulClient[clientType].getEntries(cmsQuery)
				.then (collection) ->
					if collection.items.length == 0
						next(new Error('About page not found on CMS'))
					else
						cmsData = collection.items?[0]?.fields
						cmsData.pageAbout = true
						if cmsData.content
							ContentParser.parseArray(cmsData.content)
						CmsHandler.render(res, 'page/page', cmsData, req.query)
				.catch (err) ->
					next(err)
		else
			ErrorController.notFound req, res
