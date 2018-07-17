logger = require 'logger-sharelatex'
marked = require 'marked'
moment = require 'moment'
ContentfulClient = require '../ContentfulClient'
ErrorController = require '../../../../../app/js/Features/Errors/ErrorController'
CmsHandler = require '../CmsHandler'

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
	if post.contentPreview
		post.contentPreview = marked(post.contentPreview)

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

	ContentfulClient[clientType].getEntries(blogQuery)
		.then (collection) ->
			if collection.items.length == 0
				ErrorController.notFound req, res
			else if page == 'blog/blog_post'
				cmsData = parseBlogPost(collection.items[0].fields)
				CmsHandler.render(res, page, cmsData, req.query)
			else
				# a list of blog posts (either all or filtered by tag)
				cmsData = { 
					items:collection.items.map (post) -> parseBlogPost(post.fields)
				}
				CmsHandler.render(res, page, cmsData, req.query)
		.catch (err) ->
			next(err)

module.exports =

	getBlog: (req, res, next)->
		if !req.query.cms
			# Leave `!req.query.cms` until content migration is finished
			ErrorController.notFound req, res
		else
			# Select operator limits fields returned. It has some restrictions,
			# such as it can only select properties to a depth of 2.
			# Not a problem now, but if we link more then we'll need to remove operator
			blogQuery = {
				content_type: 'blogPost'
				order: '-fields.publishDate'
				select: 'fields.author,fields.content,fields.contentPreview,fields.publishDate,fields.slug,fields.tag,fields.title'
			}
			if req.query.tag
				# get the ID of the tag via the tag in the URL
				# to do - stricter query?
				# API will return posts tagged with "Auto-compile" if the query is " Auto-compil"
				getTagId(req.query.tag)
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

	getBlogPost: (req, res, next)->
		if !req.query.cms
			# Leave `!req.query.cms` until content migration is finished
			ErrorController.notFound req, res
		else
			blogQuery = {
				content_type: 'blogPost'
				'fields.slug': req.params.slug
			}
			getAndRenderBlog(req, res, next, blogQuery, 'blog/blog_post')