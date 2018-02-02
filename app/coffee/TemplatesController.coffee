path = require('path')
ProjectUploadManager = require('../../../../app/js/Features/Uploads/ProjectUploadManager')
ProjectOptionsHandler = require("../../../../app/js/Features/Project/ProjectOptionsHandler")
ProjectDetailsHandler = require('../../../../app/js/Features/Project/ProjectDetailsHandler')
ProjectGetter = require('../../../../app/js/Features/Project/ProjectGetter')
EditorController = require('../../../../app/js/Features/Editor/EditorController')
AuthenticationController = require('../../../../app/js/Features/Authentication/AuthenticationController')
TemplatesPublisher = require("./TemplatesPublisher")
settings = require('settings-sharelatex')
fs = require('fs')
request = require('request')
uuid = require('uuid')
logger = require('logger-sharelatex')
async = require("async")


module.exports =

	createProjectFromZipTemplate: (req, res)->
		currentUserId = AuthenticationController.getLoggedInUserId(req)
		logger.log body:req.session.templateData, "creating project from zip"
		if !req.session.templateData?
			return res.redirect "/project"

		zipUrl = req.session.templateData.zipUrl

		if zipUrl.slice(0,12).indexOf("templates") == -1
			zipUrl = "#{settings.siteUrl}#{zipUrl}"
		else
			zipUrl = "#{settings.apis.templates.url}#{zipUrl}"

		zipReq = request(zipUrl)

		createFromZip(
			zipReq,
			{
				templateName: req.session.templateData.templateName,
				currentUserId:currentUserId,
				compiler: req.session.templateData.compiler
			},
			req,
			res
		)

	publishProject: (req, res, next) ->
		project_id = req.params.Project_id
		ProjectGetter.getProject project_id, {owner_ref: 1}, (error, project) ->
			return callback(error) if error?
			user_id = project.owner_ref.toString()
			logger.log user_id:user_id, project_id:project_id, "receiving request to publish project as template"
			TemplatesPublisher.publish user_id, project_id, (error) ->
				return next(error) if error?
				res.sendStatus 204

	unpublishProject: (req, res, next) ->
		project_id = req.params.Project_id
		ProjectGetter.getProject project_id, {owner_ref: 1}, (error, project) ->
			return callback(error) if error?
			user_id = project.owner_ref.toString()
			logger.log user_id:user_id, project_id:project_id, "receiving request to unpublish project"
			TemplatesPublisher.unpublish user_id, project_id, (error) ->
				return next(error) if error?
				res.sendStatus 204
				
	updateProjectDescription: (req, res, next) ->
		project_id = req.params.Project_id
		{description} = req.body
		EditorController.updateProjectDescription project_id, description, (error) ->
			return next(error) if error?
			res.sendStatus 204

	getTemplateDetails: (req, res, next)->
		project_id = req.params.Project_id
		ProjectGetter.getProject project_id, {owner_ref: 1}, (error, project) ->
			return next(error) if error?
			user_id = project.owner_ref.toString()
			async.parallel {
				details: (cb)->
					TemplatesPublisher.getTemplateDetails user_id, project_id, cb
				description: (cb)->
					ProjectDetailsHandler.getProjectDescription project_id, cb
			}, (err, results)->
				if err?
					logger.err err:err, user_id:user_id, project_id:project_id, "something went wrong getting template details"
					return next(err)
				details = results.details
				details.description = results.description
				res.json details

	getV1Template: (req, res)->
		templateId = req.params.Template_id
		if !/^[0-9]+$/.test(templateId)
			logger.err templateId:templateId, "invalid template id"
			return res.sendStatus 500
		data = {}
		data.id = templateId
		data.name = req.query.templateName
		data.compiler = req.query.latexEngine
		res.render path.resolve(__dirname, "../views/new_from_template"), data

	createProjectFromV1Template: (req, res)->
		currentUserId = AuthenticationController.getLoggedInUserId(req)
		zipUrl =	"#{settings.overleaf.host}/api/v1/sharelatex/templates/#{req.body.templateId}"
		zipReq = request(zipUrl, {
			'auth': {
				'user': settings.overleaf.v1Api.user,
				'pass': settings.overleaf.v1Api.password
			}
		})

		createFromZip(
			zipReq,
			{
				templateName: req.body.templateName,
				currentUserId: currentUserId,
				compiler: req.body.compiler
			},
			req,
			res
		)

	createFromZip: createFromZip

setCompiler = (project_id, compiler, callback)->
	if compiler?
		ProjectOptionsHandler.setCompiler project_id, compiler, callback
	else
		callback()

createFromZip = (zipReq, options, req, res)->
	dumpPath = "#{settings.path.dumpFolder}/#{uuid.v4()}"
	writeStream = fs.createWriteStream(dumpPath)

	zipReq.on "error", (error) ->
		logger.error err: error, "error getting zip from template API"
	zipReq.pipe(writeStream)
	writeStream.on 'close', ->
		ProjectUploadManager.createProjectFromZipArchive options.currentUserId, options.templateName, dumpPath, (err, project)->
			if err?
				logger.err err:err, zipReq:zipReq, "problem building project from zip"
				return res.sendStatus 500
			setCompiler project._id, options.compiler, ->
				fs.unlink dumpPath, ->
				delete req.session.templateData
				res.redirect "/project/#{project._id}"
