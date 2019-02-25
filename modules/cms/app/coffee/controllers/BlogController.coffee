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

_blogPostAuthors = (authorArr) ->
	authors = ''

	if authorArr.length == 1
		authors = authorArr[0]
	else if authorArr.length == 2
		authors = authorArr.join(' and ')
	else if authorArr.length > 2
		authorsList[authorArr.length-1] = 'and ' + authorsList[authorArr.length-1];
		authors = authorArr.join(', ')

	authors

_parseBlogPost = (post) ->
	authorsList = []

	if post.content
		post.content = marked(post.content)
		post.content = sanitizeHtml(post.content, sanitizeOptions)

	if post.contentPreview
		post.contentPreview = marked(post.contentPreview)
		post.contentPreview = sanitizeHtml(post.contentPreview, sanitizeOptions)

	if post.title
		post.title = sanitizeHtml(post.title, sanitizeOptions)

	if post.publishDate
		post.publishDatePretty = moment(post.publishDate).format('LL')

	if post.author
		post.author.forEach (author) ->
			# firstName is required
			if author.fields && author.fields.firstName
				authorsList.push(author.fields.firstName)

	if post.tag
		post.tagsPretty = []
		for tag in post.tag
			if tag.fields && tag.fields.tag
				post.tagsPretty.push(tag.fields.tag)

	post.authorDisplay = _blogPostAuthors(authorsList)

	post

_getTagId = (tag) ->
	query = {
		content_type: 'blogTag'
		'fields.tag': tag
	}
	ContentfulClient.client.getEntries(query)

_queryApi = (blogQuery, preview=false) ->
	# clientType determines which API to use.
	# client is for published data
	# clientPreview is for unpublished data
	clientType = if preview || preview == '' then 'clientPreview' else 'client'
	ContentfulClient[clientType].getEntries(blogQuery)

_readyBlogListData = (req, collection) ->
	url_path = "/blog#{if req.params.tag then "/tagged/#{req.params.tag}" else ''}"
	return {
		items: (collection.items.map (post) -> _parseBlogPost(post.fields)),
		pages: {
			current_page: if req.params.page && !isNaN(req.params.page) then req.params.page else 1,
			total: collection.total,
			total_pages: Math.ceil(collection.total/resultsPerPage)
		},
		tag: req.params.tag,
		url_path: url_path
	}

_getSlugViaV1Id = (id, req, res) ->
	# separating ID out of req, because of another use for this:
	# for if the slug contains an ID with the wrong slug
	blogQuery = {
		content_type: 'blogPost'
		'fields.v1Id': parseInt(id, 10)
	}

	_queryApi(blogQuery)
		.then (collection) ->
			collection?.items?[0]?.fields?.slug
		

_makeBlogListQuery = (req, res) ->
	return new Promise (resolve, reject) ->
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
			_getTagId(req.params.tag)
				.then (tagData) ->
					if tagData && tagData.items[0] && tagData.items[0].sys && tagData.items[0].sys.id
						blogQuery['fields.tag.sys.id[in]'] = tagData.items[0].sys.id
						resolve(blogQuery)
					else
						# to do - better 404 - specific for blog tag
						ErrorController.notFound req, res
				.catch (tagErr) ->
					reject(tagErr)
		else
			resolve(blogQuery)


module.exports =

	getBlog: (req, res, next)->
		_makeBlogListQuery(req, res, next)
			.then (blogQuery) ->
				_queryApi(blogQuery, req.query.preview)
					.then (cmsResponse) ->
						cmsData = _readyBlogListData(req, cmsResponse)
						CmsHandler.render(res, 'blog/blog', cmsData, req.query)
					.catch (next)
			.catch (next)


	getFeed: (req, res, next)->
		_makeBlogListQuery(req, res, next)
			.then (blogQuery) ->
				_queryApi(blogQuery, req.query.preview)
					.then (cmsResponse) ->
						cmsData = _readyBlogListData(req, cmsResponse)
						CmsHandler.render(res, 'blog/feed', cmsData, req.query)
					.catch (next)
			.catch (next)

	getBlogPost: (req, res, next)->
		if !isNaN(req.params.slug)
			# v1 would sometimes link to blog ID
			_getSlugViaV1Id(req.params.slug, req, res)
				.then (slug) ->
					if slug
						res.redirect 301, "/blog/#{slug}"
					else
						ErrorController.notFound req, res
				.catch (next)
		else
			blogQuery = {
				content_type: 'blogPost'
				'fields.slug': req.params.slug
			}
			_queryApi(blogQuery, req.query.preview)
				.then (collection) ->
					if collection?.items?[0]
						cmsData = _parseBlogPost(collection.items[0].fields)
						CmsHandler.render(res, 'blog/blog_post', cmsData)
					else
						# check if they have a v1 ID but with the wrong slug
						slugPieces = req.params.slug.split('-')
						if slugPieces && slugPieces[0] && !isNaN(slugPieces[0])
							_getSlugViaV1Id(slugPieces[0], req, res)
								.then (slug) ->
									if slug
										res.redirect 301, "/blog/#{slug}"
									else
										ErrorController.notFound req, res
								.catch (next)
						else
							ErrorController.notFound req, res
				.catch (next)

	redirectToList: (req, res)->
		res.redirect 301, "/blog"