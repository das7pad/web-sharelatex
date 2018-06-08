logger = require 'logger-sharelatex'
marked = require 'marked'
path = require 'path'
ContentfulClient = require '../ContentfulClient'
ErrorController = require '../../../../../app/js/Features/Errors/ErrorController'

pageAbout = path.resolve(__dirname, '../../views/about/page')

module.exports =

	getPage: (req, res, next)->
		if !req.query.cms
			# Leave `!req.query.cms` until content migration is finished
			ErrorController.notFound req, res
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
				content_type: 'pageAbout'
				include: 10
			}

			ContentfulClient[clientType].getEntries(cmsQuery)
				.then (collection) ->
					if collection.items.length == 0
						next(new Error('About page not found on CMS'))
					else
						[data] = collection.items
						if data.fields.about
							data.fields.about = marked(data.fields.about)
						pageData.data = data.fields
						res.render pageAbout, pageData
				.catch (err) ->
					next(err)

