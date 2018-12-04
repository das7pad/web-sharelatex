logger = require('logger-sharelatex')
path = require('path')
URL = require('url-parse')
AuthenticationController = require('../../../../app/js/Features/Authentication/AuthenticationController')
ProjectCreationHandler = require('../../../../app/js/Features/Project/ProjectCreationHandler')
ProjectHelper = require('../../../../app/js/Features/Project/ProjectHelper')
ProjectDetailsHandler = require('../../../../app/js/Features/Project/ProjectDetailsHandler')
DocumentHelper = require('../../../../app/js/Features/Documents/DocumentHelper')
ProjectUploadManager = require('../../../../app/js/Features/Uploads/ProjectUploadManager')
Project = require('../../../../app/js/models/Project').Project
OpenInOverleafHelper = require('./OpenInOverleafHelper')

module.exports = OpenInOverleafController =
	# 'open in overleaf' /docs API
	openInOverleaf: (req, res, next)->
		return res.redirect '/' unless req.body.snip? || req.body.encoded_snip? || req.body.snip_uri?

		logger.log user: user_id, "creating project from snippet"
		user_id = AuthenticationController.getLoggedInUserId(req)

		OpenInOverleafController._populateSnippetFromRequest req, (err, snippet) ->
			return next(err) if err?

			if snippet.snip?
				content = OpenInOverleafHelper.getDocumentLinesFromSnippet(snippet)

				projectName = DocumentHelper.getTitleFromTexContent(content) || snippet.defaultTitle
				ProjectDetailsHandler.generateUniqueName user_id, ProjectDetailsHandler.fixProjectName(projectName), (err, projectName) ->
					return next(err) if err?

					ProjectCreationHandler.createProjectFromSnippet user_id, projectName, content, (err, project) ->
						return next(err) if err?

						update = {}

						compiler = ProjectHelper.compilerFromV1Engine(req.body.engine)
						update.compiler = compiler if compiler?

						if Object.keys(update).length
							Project.update {_id: project.id}, update, (err) ->
								return next(err) if err?
								OpenInOverleafController._sendResponse(req, res, project)
						else
							OpenInOverleafController._sendResponse(req, res, project)
			else if snippet.projectFile?
				ProjectUploadManager.createProjectFromZipArchive user_id, snippet.defaultTitle, snippet.projectFile, (error, project) ->
					return next(error) if error
					OpenInOverleafController._sendResponse(req, res, project)
			else
				res.redirect('/')

	_populateSnippetFromRequest: (req, cb = (error, result)->) ->
		comment = OpenInOverleafController._getMainFileCommentFromSnipRequest(req)
		OpenInOverleafController._getSnippetContentsFromRequest req, (error, snippet) ->
			return cb(error) if error?
			return cb(new Error("Couldn't extract snippet")) unless snippet.snip? || snippet.projectFile?

			snippet.comment = comment
			snippet.defaultTitle = OpenInOverleafController._getDefaultTitleFromSnipRequest(req)
			cb(null, snippet)

	_getSnippetContentsFromRequest: (req, cb = (error, snippet)->) ->
		snippet = {}
		if req.body.snip?
			snippet.snip = req.body.snip
			return cb(null, snippet)
		else if req.body.encoded_snip?
			snippet.snip = decodeURIComponent(req.body.encoded_snip)
			return cb(null, snippet)
		else if req.body.snip_uri?
			OpenInOverleafHelper.populateSnippetFromUri req.body.snip_uri, snippet, cb
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
		if req.body.snip_uri?
			return path.basename(req.body.snip_uri).replace(FILE_EXTENSION_REGEX, '')

		return req.i18n.translate('new_snippet_project')
