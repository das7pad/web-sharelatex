logger = require 'logger-sharelatex'
marked = require 'marked'
path = require 'path'
ContentfulClient = require '../ContentfulClient'
ErrorController = require '../../../../../app/js/Features/Errors/ErrorController'

pageBlog = path.resolve(__dirname, '../../views/blog/blog')
pageBlogPost = path.resolve(__dirname, '../../views/blog/blog_post')
months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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
	post.fields.content = if post.fields.content then marked(post.fields.content) else null
	post.fields.contentPreview = if post.fields.contentPreview then marked(post.fields.contentPreview) else null

	if post.fields.publishDate
		pubDate = new Date(post.fields.publishDate)
		post.fields.publishDateDay = pubDate.getDate()
		post.fields.publishDateMonth = months[pubDate.getMonth()]
		post.fields.publishDateYear = pubDate.getFullYear()

	if post.fields.author
		post.fields.author.forEach (author) ->
			# firstName is required
			if author.fields && author.fields.firstName
				authorsList.push(author.fields.firstName)

	post.fields.authorDisplay = blogPostAuthors(authorsList)

	post

getTagId = (tag) ->
	query = {
		content_type: 'blogTag'
		'fields.tag[match]': tag
	}
	ContentfulClient.client.getEntries(query)

getAndRenderBlog = (req, res, blogQuery, page, tag) ->
	# clientType determines which API to use.
	# client is for published data
	# clientPreview is for unpublished data
	clientType = if req.query.preview == '' then 'clientPreview' else 'client'
	# pageData.clientType is used to display a "Preview" element in the UI
	pageData = {
		clientType: clientType
		tag: tag
	}

	ContentfulClient[clientType].getEntries(blogQuery)
		.then (blogCollection) ->
			if blogCollection.items.length == 0
				ErrorController.notFound req, res
			else
				blogCollection.items.map (post) -> parseBlogPost(post)
				pageData.items = blogCollection.items
				res.render page, pageData
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
							getAndRenderBlog(req, res, blogQuery, pageBlog, req.query.tag)
						else
							# to do - better 404 - specific for blog tag
							ErrorController.notFound req, res
					.catch (tagErr) ->
						next(tagErr)
			else
				getAndRenderBlog(req, res, blogQuery, pageBlog)

	getBlogPost: (req, res, next)->
		blogQuery = {
			content_type: 'blogPost'
			'fields.slug': req.params.slug
		}
		getAndRenderBlog(req, res, blogQuery, pageBlogPost)
