logger = require('logger-sharelatex')
Path = require('path')
URL = require('url-parse')
async = require('async')
AuthenticationController = require('../../../../app/js/Features/Authentication/AuthenticationController')
ProjectCreationHandler = require('../../../../app/js/Features/Project/ProjectCreationHandler')
ProjectHelper = require('../../../../app/js/Features/Project/ProjectHelper')
ProjectDetailsHandler = require('../../../../app/js/Features/Project/ProjectDetailsHandler')
DocumentHelper = require('../../../../app/js/Features/Documents/DocumentHelper')
ProjectUploadManager = require('../../../../app/js/Features/Uploads/ProjectUploadManager')
Errors = require('../../../../app/js/Features/Errors/Errors')
OpenInOverleafHelper = require('./OpenInOverleafHelper')
OpenInOverleafErrors = require('./OpenInOverleafErrors')

module.exports = OpenInOverleafController =
	# /devs documentation page
	showDocumentation: (req, res, next)->
		res.render Path.resolve(__dirname, '../views/documentation')

	# 'open in overleaf' /docs API
	openInOverleaf: (req, res, next)->
		paramCount = req.body.snip? +
			req.body.encoded_snip? +
			req.body.snip_uri? +
			req.body.zip_uri? +
			req.body.template? +
			(req.body.partner? && req.body.client_media_id?)
		return next(new OpenInOverleafErrors.MissingParametersError) if paramCount == 0
		return next(new OpenInOverleafErrors.AmbiguousParametersError) if paramCount > 1

		logger.log user: user_id, "creating project from snippet"
		user_id = AuthenticationController.getLoggedInUserId(req)

		sendResponse = (error, project) ->
			return next(error) if error?
			OpenInOverleafController._sendResponse(req, res, project)

		OpenInOverleafController._populateSnippetFromRequest req, (err, snippet) ->
			return sendResponse(err) if err?
			if snippet.snip?
				OpenInOverleafController._createProjectFromPostedSnippet user_id, snippet, sendResponse
			else if snippet.projectFile?
				OpenInOverleafController._createProjectFromZipArchive user_id, snippet, sendResponse
			else if snippet.files?
				OpenInOverleafController._createProjectFromFileList user_id, snippet, sendResponse
			else
				next(new OpenInOverleafErrors.MissingParametersError)

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
				(project, cb) ->
					if snippet.brandVariationId?
						OpenInOverleafHelper.setProjectBrandVariationFromId project, snippet.brandVariationId, (err) ->
							return cb(err) if err?
							cb(null, project)
					else
						cb(null, project)
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
				(project, cb) ->
					if snippet.brandVariationId?
						OpenInOverleafHelper.setProjectBrandVariationFromId project, snippet.brandVariationId, (err) ->
							return cb(err) if err?
							cb(null, project)
					else
						cb(null, project)
			]
			callback
		)

	_createProjectFromZipArchive: (user_id, snippet, callback = (error, project)->) ->
		async.waterfall(
			[
				(cb) ->
					projectName = if typeof snippet.snip_name is 'string' then snippet.snip_name else snippet.defaultTitle
					ProjectUploadManager.createProjectFromZipArchive user_id, projectName, snippet.projectFile, (err, project) ->
						return cb(new OpenInOverleafErrors.ZipExtractError) if err?
						cb(null, project)
				(project, cb) ->
					if snippet.publisherSlug?
						OpenInOverleafHelper.setProjectBrandVariationFromSlug project, snippet.publisherSlug, (err) ->
							return cb(err) if err?
							cb(null, project)
					else if snippet.brandVariationId?
						OpenInOverleafHelper.setProjectBrandVariationFromId project, snippet.brandVariationId, (err) ->
							return cb(err) if err?
							cb(null, project)
					else
						cb(null, project)
			]
			callback
		)

	_populateSnippetFromRequest: (req, cb = (error, result)->) ->
		comment = OpenInOverleafController._getMainFileCommentFromSnipRequest(req)
		OpenInOverleafController._getSnippetContentsFromRequest req, (error, snippet) ->
			return cb(error) if error?
			return cb(new Errors.InvalidError) unless snippet.snip? || snippet.projectFile? || snippet.files?

			snippet.comment = comment
			snippet.engine = req.body.engine if req.body.engine?
			snippet.publisherSlug = req.body.publisher_slug if req.body.publisher_slug?
			snippet.defaultTitle = OpenInOverleafController._getDefaultTitleFromSnipRequest(req)
			cb(null, snippet)

	_getSnippetContentsFromRequest: (req, cb = (error, snippet)->) ->
		snippet = {}
		snippet.snip_name = req.body.snip_name if req.body.snip_name?
		snippet.snip_name = snippet.snip_name[0] if Array.isArray(snippet.snip_name) && snippet.snip_name.length == 1
		snippet.brandVariationId = req.body.brand_variation_id if req.body.brand_variation_id?

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
		else if req.body.template?
			OpenInOverleafHelper.populateSnippetFromTemplate req.body.template, snippet, cb
		else if (req.body.partner? && req.body.client_media_id?)
			OpenInOverleafHelper.populateSnippetFromConversionJob req.body.partner, req.body.client_media_id, snippet, cb
		else
			cb(new OpenInOverleafErrors.MissingParametersError)

	_getMainFileCommentFromSnipRequest: (req) ->
		comment = ''
		if req.body.comment != 'none'
			referrer = new URL(req.body.referrer || '')
			if referrer.hostname && referrer.hostname.match /texample\.net$/
				comment = OpenInOverleafHelper.snippetFileComment('texample')
			else
				comment = OpenInOverleafHelper.snippetFileComment('default')

		return comment

	_sendResponse: (req, res, project) ->
		uri = "/project/#{project._id}"

		if req.xhr || req.headers.accept?.indexOf('json') > -1
			res.json({redirect: uri, projectId: project._id})
		else
			res.redirect uri

	_getDefaultTitleFromSnipRequest: (req) ->
		FILE_EXTENSION_REGEX = /\.[^.]+$/
		uri = (req.body.zip_uri || req.body.snip_uri)
		if typeof uri is 'string'
			return Path.basename(uri).replace(FILE_EXTENSION_REGEX, '')

		return req.i18n.translate('new_snippet_project')
