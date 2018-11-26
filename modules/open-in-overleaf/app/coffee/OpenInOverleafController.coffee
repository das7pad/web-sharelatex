logger = require('logger-sharelatex')
URL = require('url-parse')
AuthenticationController = require('../../../../app/js/Features/Authentication/AuthenticationController')
ProjectCreationHandler = require('../../../../app/js/Features/Project/ProjectCreationHandler')
ProjectHelper = require('../../../../app/js/Features/Project/ProjectHelper')
ProjectDetailsHandler = require('../../../../app/js/Features/Project/ProjectDetailsHandler')
DocumentHelper = require('../../../../app/js/Features/Documents/DocumentHelper')
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

			content = OpenInOverleafHelper.getDocumentLinesFromSnippet(snippet)

			projectName = DocumentHelper.getTitleFromTexContent(content) || snippet.defaultTitle
			ProjectDetailsHandler.generateUniqueName user_id, projectName, (err, projectName) ->
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

	_populateSnippetFromRequest: (req, cb = (error, result)->) ->
		comment = OpenInOverleafController._getMainFileCommentFromSnipRequest(req)
		OpenInOverleafController._getSnippetContentsFromRequest req, (error, snippet) ->
			return cb(error) if error?
			return cb(new Error("Couldn't extract snippet")) unless snippet?

			cb(null, {
				comment: comment
				snip: snippet
				defaultTitle: req.i18n.translate('new_snippet_project')
			})

	_getSnippetContentsFromRequest: (req, cb = (error, result)->) ->
		if req.body.snip?
			return cb(null, req.body.snip)
		else if req.body.encoded_snip?
			return cb(null, decodeURIComponent(req.body.encoded_snip))
		else if req.body.snip_uri?
			return OpenInOverleafHelper.getSnippetFromUri req.body.snip_uri, cb

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