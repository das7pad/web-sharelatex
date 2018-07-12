logger = require 'logger-sharelatex'
marked = require 'marked'
ContentfulClient = require '../ContentfulClient'
ErrorController = require '../../../../../app/js/Features/Errors/ErrorController'
CmsHandler = require '../CmsHandler'

module.exports =

	getPage: (req, res, next)->
		if !req.query.cms
			# Leave `!req.query.cms` until content migration is finished
			ErrorController.notFound req, res
		else
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
						if cmsData.about
							cmsData.about = marked(cmsData.about)
						CmsHandler.render(res, 'about/page', cmsData, req.query)
				.catch (err) ->
					next(err)
