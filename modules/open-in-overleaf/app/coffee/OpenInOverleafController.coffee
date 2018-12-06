logger = require('logger-sharelatex')
path = require('path')
URL = require('url-parse')
async = require('async')
AuthenticationController = require('../../../../app/js/Features/Authentication/AuthenticationController')
ProjectCreationHandler = require('../../../../app/js/Features/Project/ProjectCreationHandler')
ProjectHelper = require('../../../../app/js/Features/Project/ProjectHelper')
ProjectDetailsHandler = require('../../../../app/js/Features/Project/ProjectDetailsHandler')
DocumentHelper = require('../../../../app/js/Features/Documents/DocumentHelper')
ProjectUploadManager = require('../../../../app/js/Features/Uploads/ProjectUploadManager')
OpenInOverleafHelper = require('./OpenInOverleafHelper')

module.exports = OpenInOverleafController =
	# 'open in overleaf' /docs API
	openInOverleaf: (req, res, next)->
		return res.redirect '/' unless req.body.snip? || req.body.encoded_snip? || req.body.snip_uri? || req.body.zip_uri?

		logger.log user: user_id, "creating project from snippet"
		user_id = AuthenticationController.getLoggedInUserId(req)

		sendResponse = (error, project) ->
			next(error) if error?
			OpenInOverleafController._sendResponse(req, res, project)

		OpenInOverleafController._populateSnippetFromRequest req, (err, snippet) ->
			return next(err) if err?
			if snippet.snip?
				OpenInOverleafController._createProjectFromPostedSnippet user_id, snippet, sendResponse
			else if snippet.projectFile?
				projectName = if typeof snippet.snip_name is 'string' then snippet.snip_name else snippet.defaultTitle
				ProjectUploadManager.createProjectFromZipArchive user_id, projectName, snippet.projectFile, sendResponse
			else if snippet.files?
				OpenInOverleafController._createProjectFromFileList user_id, snippet, sendResponse
			else
				res.redirect('/')

	_createProjectFromPostedSnippet: (user_id, snippet, callback = (error, project)->) ->
		content = OpenInOverleafHelper.getDocumentLinesFromSnippet(snippet)
		async.waterfall(
			[
				(cb) ->
					projectName = if typeof snippet.snip_name is 'string' then snippet.snip_name else DocumentHelper.getTitleFromTexContent(content) || snippet.defaultTitle
					ProjectDetailsHandler.generateUniqueName user_id, ProjectDetailsHandler.fixProjectName(projectName), (err, name) ->
						cb(err, name)
				(projectName, cb) ->
					ProjectCreationHandler.createProjectFromSnippet user_id, projectName, content, (err, project) ->
						cb(err, project)
				(project, cb) ->
					OpenInOverleafHelper.setCompilerForProject project, snippet.engine, (err) ->
						cb(err, project)
			]
			callback
		)

	_createProjectFromFileList: (user_id, snippet, callback = (error, project)->) ->
		async.waterfall(
			[
				(cb) ->
					ProjectDetailsHandler.generateUniqueName user_id, ProjectDetailsHandler.fixProjectName(snippet.title || snippet.defaultTitle), (err, name) ->
						cb(err, name)
				(projectName, cb) ->
					ProjectCreationHandler.createBlankProject user_id, projectName, (err, project) ->
						cb(err, project)
				(project, cb) ->
					OpenInOverleafHelper.populateProjectFromFileList project, snippet, (err) ->
						cb(err, project)
			]
			callback
		)

	_populateSnippetFromRequest: (req, cb = (error, result)->) ->
		comment = OpenInOverleafController._getMainFileCommentFromSnipRequest(req)
		OpenInOverleafController._getSnippetContentsFromRequest req, (error, snippet) ->
			return cb(error) if error?
			return cb(new Error("Couldn't extract snippet")) unless snippet.snip? || snippet.projectFile? || snippet.files?

			snippet.comment = comment
			snippet.engine = req.body.engine if req.body.engine?
			snippet.publisher_slug = req.body.publisher_slug if req.body.publisher_slug?
			snippet.defaultTitle = OpenInOverleafController._getDefaultTitleFromSnipRequest(req)
			cb(null, snippet)

	_getSnippetContentsFromRequest: (req, cb = (error, snippet)->) ->
		snippet = {}
		snippet.snip_name = req.body.snip_name if req.body.snip_name?
		snippet.snip_name = snippet.snip_name[0] if Array.isArray(snippet.snip_name) && snippet.snip_name.length == 1

		if req.body.snip?
			snippet.snip = req.body.snip
			return cb(null, snippet)
		else if req.body.encoded_snip?
			snippet.snip = decodeURIComponent(req.body.encoded_snip)
			return cb(null, snippet)
		else if Array.isArray(req.body.snip_uri)
			if req.body.snip_uri.length == 1
				OpenInOverleafHelper.populateSnippetFromUri req.body.snip_uri[0], snippet, cb
			else
				OpenInOverleafHelper.populateSnippetFromUriArray req.body.snip_uri, snippet, cb
		else if req.body.snip_uri? || req.body.zip_uri?
			OpenInOverleafHelper.populateSnippetFromUri req.body.snip_uri || req.body.zip_uri, snippet, cb
		else
			cb(new Error('No snippet in request'))

	_getMainFileCommentFromSnipRequest: (req) ->
		comment = ''
		if req.body.comment != 'none'
			referer = new URL(req.header('Referer') || '')
			if referer.hostname && referer.hostname.match /texample\.net$/
				comment = req.i18n.translate('texample_snippet_comment').trim()
			else
				comment = req.i18n.translate('default_snippet_comment').trim()

			# Add comment character to each line, and terminate with a newline to ensure the following content isn't commented
			comment = comment.split("\n").map((line)-> "% #{line}").join("\n") + "\n"

		return comment

	_sendResponse: (req, res, project) ->
		uri = "/project/#{project._id}"

		if req.xhr || req.headers.accept?.indexOf('json') > -1
			res.setHeader('Content-Type', 'application/json')
			res.send(JSON.stringify({redirect: uri}))
		else
			res.redirect uri

	_getDefaultTitleFromSnipRequest: (req) ->
		FILE_EXTENSION_REGEX = /\.[^.]+$/
		uri = (req.body.zip_uri || req.body.snip_uri)
		if typeof uri is 'string'
			return path.basename(uri).replace(FILE_EXTENSION_REGEX, '')

		return req.i18n.translate('new_snippet_project')
