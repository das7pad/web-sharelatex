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

		dumpPath = "#{settings.path.dumpFolder}/#{uuid.v4()}"
		writeStream = fs.createWriteStream(dumpPath)
		zipUrl = req.session.templateData.zipUrl

		if zipUrl.slice(0,12).indexOf("templates") == -1
			zipUrl = "#{settings.siteUrl}#{zipUrl}"
		else
			zipUrl = "#{settings.apis.templates.url}#{zipUrl}"

		zipReq = request(zipUrl)
		zipReq.on "error", (error) ->
			logger.error err: error, "error getting zip from template API"
		zipReq.pipe(writeStream)
		writeStream.on 'close', ->
			ProjectUploadManager.createProjectFromZipArchive currentUserId, req.session.templateData.templateName, dumpPath, (err, project)->
				if err?
					logger.err err:err, zipUrl:zipUrl, "problem building project from zip"
					return res.sendStatus 500
				setCompiler project._id, req.session.templateData.compiler, ->
					fs.unlink dumpPath, ->
					delete req.session.templateData
					res.redirect "/project/#{project._id}"

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
		data = {}
		data.id = req.params.Template_id
		data.name = req.session.templateData.templateName
		res.render path.resolve(__dirname, "../views/clone"), data

	createProjectFromV1Template: (req, res)->
		template_id = req.body.templateId
		template_name = req.body.templateName
		res.sendStatus 501

setCompiler = (project_id, compiler, callback)->
	if compiler?
		ProjectOptionsHandler.setCompiler project_id, compiler, callback
	else
		callback()
