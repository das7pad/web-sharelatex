logger = require 'logger-sharelatex'
marked = require 'marked'
moment = require 'moment'
sanitizeHtml = require 'sanitize-html'
ContentfulClient = require '../ContentfulClient'
ErrorController = require '../../../../../app/js/Features/Errors/ErrorController'
CmsHandler = require '../CmsHandler'
Settings = require 'settings-sharelatex'

resultsPerPage = 5;
sanitizeOptions = if Settings?.modules?.sanitize?.options? then Settings.modules.sanitize.options else sanitizeHtml.defaults

blogPostAuthors = (authorArr) ->
	authors = ''

	if authorArr.length == 1
		authors = authorArr[0]
	else if authorArr.length == 2
		authors = authorArr.join(' and ')
	else if authorArr.length > 2
		authorsList[authorArr.length-1] = 'and ' + authorsList[authorArr.length-1];
		authors = authorArr.join(', ')

	authors

parseBlogPost = (post) ->
	authorsList = []

	if post.content
		post.content = marked(post.content)
		post.content = sanitizeHtml(post.content, sanitizeOptions)

	if post.contentPreview
		post.contentPreview = marked(post.contentPreview)
		post.contentPreview = sanitizeHtml(post.contentPreview, sanitizeOptions)

	if post.publishDate
		post.publishDatePretty = moment(post.publishDate).format('LL')

	if post.author
		post.author.forEach (author) ->
			# firstName is required
			if author.fields && author.fields.firstName
				authorsList.push(author.fields.firstName)

	post.authorDisplay = blogPostAuthors(authorsList)

	post

getTagId = (tag) ->
	query = {
		content_type: 'blogTag'
		'fields.tag[match]': tag
	}
	ContentfulClient.client.getEntries(query)

getAndRenderBlog = (req, res, next, blogQuery, page) ->
	# clientType determines which API to use.
	# client is for published data
	# clientPreview is for unpublished data
	clientType = if req.query.preview || req.query.preview == '' then 'clientPreview' else 'client'
	url_path = "/blog#{if req.params.tag then "/tagged/#{req.params.tag}" else ''}"

	_queryApi(clientType, blogQuery)
		.then (collection) ->
			if collection.items.length == 0
				# check if they have a v1 ID but with the wrong slug
				slugPieces = req.params.slug.split('-')
				if slugPieces && slugPieces[0] && !isNaN(slugPieces[0])
					_v1IdQuery(slugPieces[0], req, res)
			else if page == 'blog/blog_post'
				# a single blog post
				cmsData = parseBlogPost(collection.items[0].fields)
				CmsHandler.render(res, page, cmsData, req.query)
			else
				# a list of blog posts (either all or filtered by tag)
				cmsData = {
					items: (collection.items.map (post) -> parseBlogPost(post.fields)),
					pages: {
						current_page: if req.params.page && !isNaN(req.params.page) then req.params.page else 1,
						total: collection.total,
						total_pages: Math.floor(collection.total/resultsPerPage)
					},
					tag: req.params.tag,
					url_path: url_path
				}
				CmsHandler.render(res, page, cmsData, req.query)
		.catch (err) ->
			next(err)

_getBlog = (req, res, next) ->
		if req.query.cms || Settings.showContentPages
			# Select operator limits fields returned. It has some restrictions,
			# such as it can only select properties to a depth of 2.
			# Not a problem now, but if we link more then we'll need to remove operator
			blogQuery = {
				content_type: 'blogPost'
				order: '-fields.publishDate'
				select: 'fields.author,fields.content,fields.contentPreview,fields.publishDate,fields.slug,fields.tag,fields.title',
				limit: resultsPerPage
			}

			# Pagination
			if req.params.page && !isNaN(req.params.page)
				blogQuery.skip = (parseInt(req.params.page - 1, 10) * resultsPerPage)

			# Filter by tag
			if req.params.tag
				# get the ID of the tag via the tag in the URL
				# to do - stricter query?
				# API will return posts tagged with "Auto-compile" if the query is " Auto-compil"
				getTagId(req.params.tag)
					.then (tagData) ->
						if tagData && tagData.items[0] && tagData.items[0].sys && tagData.items[0].sys.id
							blogQuery['fields.tag.sys.id[in]'] = tagData.items[0].sys.id
							getAndRenderBlog(req, res, next, blogQuery, 'blog/blog')
						else
							# to do - better 404 - specific for blog tag
							ErrorController.notFound req, res
					.catch (tagErr) ->
						next(tagErr)
			else
				getAndRenderBlog(req, res, next, blogQuery, 'blog/blog')
		else
			ErrorController.notFound req, res


_queryApi = (clientType, blogQuery) ->
	ContentfulClient[clientType].getEntries(blogQuery)

_v1IdQuery = (id, req, res) ->
	# separating ID out of req, because of another use for this:
	# for if the slug contains an ID with the wrong slug

	blogQuery = {
		content_type: 'blogPost'
		'fields.v1Id': parseInt(id, 10)
	}

	_queryApi('client', blogQuery)
		.then (collection) ->
			if collection.items?[0]?.fields?.slug?
				res.redirect 301, "/blog/#{collection.items[0].fields.slug}"
			else
				ErrorController.notFound req, res
		.catch (err) ->
			next(err)

module.exports =

	getBlog: (req, res, next)->
		_getBlog(req, res, next)

	getBlogPost: (req, res, next)->
		if req.query.cms || Settings.showContentPages
			if req.params.slug == 'page' || req.params.slug == 'tagged'
				# for if someone went to /blog/page/ or /blog/tagged/
				# without a page number or tag param
				_getBlog(req, res, next)
			else if !isNaN(req.params.slug)
				# v1 would sometimes link to blog ID
				_v1IdQuery(req.params.slug, req, res)
			else
				blogQuery = {
					content_type: 'blogPost'
					'fields.slug': req.params.slug
				}
				getAndRenderBlog(req, res, next, blogQuery, 'blog/blog_post')
		else
			ErrorController.notFound req, res