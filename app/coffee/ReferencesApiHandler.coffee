settings = require("settings-sharelatex")
request = require("request")
thirdpartyUrl = settings.apis.thirdpartyreferences?.url || "http://localhost:3023"
referencesUrl = settings.apis.references?.url || "http://localhost:3040"
mongojs = require "mongojs"
db = mongojs.connect(settings.mongo.url, ["users"])
ObjectId = mongojs.ObjectId
UserUpdater = require("../../../../app/js/Features/User/UserUpdater")
logger = require("logger-sharelatex")
UserGetter = require('../../../../app/js/Features/User/UserGetter')
ProjectEntityHandler = require('../../../../app/js/Features/Project/ProjectEntityHandler')
DocumentUpdaterHandler = require('../../../../app/js/Features/DocumentUpdater/DocumentUpdaterHandler')
EditorRealTimeController = require('../../../../app/js/Features/Editor/EditorRealTimeController')

module.exports = ReferencesApiHandler =

	userCanMakeRequest: (userId, ref_provider, callback=(err, canMakeRequest)->) ->
		UserGetter.getUser userId, (err, user) ->
			callback(err, user?.features?[ref_provider] == true)

	startAuth: (req, res, next)->
		user_id = req.session?.user?._id
		ref_provider = req.params.ref_provider
		logger.log {user_id, ref_provider}, "starting references auth process"
		ReferencesApiHandler.userCanMakeRequest user_id, ref_provider, (err, canMakeRequest) ->
			if err
				logger.error {user_id, ref_provider, err}, "error determining if user can make this request"
				return next(err)
			if !canMakeRequest
				return res.send 403
			opts =
				method:"get"
				url: "/user/#{user_id}/#{ref_provider}/oauth"
				json:true
			ReferencesApiHandler.make3rdRequest opts, (err, response, body)->
				if err
					logger.error {user_id, ref_provider, err}, "error contacting tpr api"
					return next(err)
				logger.log body:body, statusCode:response.statusCode, "thirdparty return"
				res.redirect(body.redirect)

	completeAuth: (req, res, next)->
		user_id = req.session?.user?._id
		ref_provider = req.params.ref_provider
		ReferencesApiHandler.userCanMakeRequest user_id, ref_provider, (err, canMakeRequest) ->
			if err
				return next(err)
			if !canMakeRequest
				return res.send 403
			opts =
				method:"get"
				url: "/user/#{user_id}/#{ref_provider}/tokenexchange"
				qs: req.query
			ReferencesApiHandler.make3rdRequest opts, (err, response, body)->
				if err
					logger.error {user_id, ref_provider, err}, "error contacting tpr api"
					return next(err)
				logger.log {user_id, ref_provider}, "auth complete"
				res.redirect "/user/settings"

	make3rdRequest: (opts, callback)->
		opts.url = "#{thirdpartyUrl}#{opts.url}"
		logger.log {url: opts.url}, 'making request to third-party-references api'
		request opts, callback

	makeRefRequest: (opts, callback)->
		opts.url = "#{referencesUrl}#{opts.url}"
		logger.log {url: opts.url}, 'making request to third-party-references api'
		request opts, callback

	unlink: (req, res, next) ->
		ref_provider = req.params.ref_provider

		ref = {}
		ref[ref_provider] = true
		update =
			$unset:
				refProviders:
					ref

		logger.log user_id:req.session?.user?._id, update:update, "reference unlink"
		UserUpdater.updateUser req.session?.user?._id, update, (err)->
			if err?
				logger.err err:err, result:result, "error unlinking reference info on user " + ref_provider
			res.redirect "/user/settings"

	bibtex: (req, res, next) ->
		user_id = req.session?.user?._id
		ref_provider = req.params.ref_provider
		ReferencesApiHandler.userCanMakeRequest user_id, ref_provider, (err, canMakeRequest) ->
			if err
				return next(err)
			if !canMakeRequest
				return res.send 403
			opts =
				method:"get"
				url: "/user/#{user_id}/#{ref_provider}/bibtex"
			logger.log {user_id, ref_provider}, "getting bibtex from third-party-references"
			ReferencesApiHandler.make3rdRequest opts, (err, response, body)->
				if err
					logger.err {user_id, ref_provider}, "error getting bibtex from third-party-references"
					return next(err)
				if 200 <= response.statusCode < 300
					logger.log {user_id, ref_provider}, "got bibtex from third-party-references, returning to client"
					res.json body
				else
					logger.log {user_id, ref_provider, statusCode:response.statusCode}, "error code from remote api"
					res.send response.statusCode

	importBibtex: (req, res, next) ->
		user_id = req.session?.user?._id
		ref_provider = req.params.ref_provider
		project_id = req.params.Project_id
		ReferencesApiHandler.userCanMakeRequest user_id, ref_provider, (err, canMakeRequest) ->
			if err
				return next(err)
			if !canMakeRequest
				return res.send 403
			opts =
				method:"get"
				url: "/user/#{user_id}/#{ref_provider}/bibtex"
			logger.log {user_id, ref_provider, project_id}, "importing bibtex from third-party-references"
			# get the bibtex from remote api
			ReferencesApiHandler.make3rdRequest opts, (err, response, body)->
				if err
					logger.err {user_id, ref_provider, project_id}, "error getting bibtex from third-party-references"
					return next(err)
				logger.log {user_id, ref_provider, project_id}, "got bibtex from third-party-references, returning to client"
				# do the thing
				lines = body.split('\n')
				# get all documents currently in project,
				ProjectEntityHandler.getAllDocs project_id, (err, allDocs) ->
					if err
						logger.err {user_id, ref_provider, project_id}, "error getting all docs for project"
						return next(err)
					# check if our target file is in this project
					targetDocName = "#{ref_provider}.bib"
					if doc = allDocs["/#{targetDocName}"]
						logger.log {user_id, ref_provider, project_id, targetDocName}, "updating document with bibtex content"
						# set document contents to the bibtex payload
						DocumentUpdaterHandler.setDocument project_id, doc._id, user_id, lines, 'references-import', (err) ->
							if err
								logger.err {user_id, ref_provider, project_id, doc_id:doc._id, err}, "error updating doc with imported bibtex"
								return next(err)
							return res.send 201
					else
						logger.log {user_id, ref_provider, project_id, targetDocName}, "creating new document with bibtex content"
						# add a new doc, with bibtex payload
						ProjectEntityHandler.addDoc project_id, undefined, targetDocName, lines, (err, doc, folder_id) ->
							if err
								logger.err {user_id, ref_provider, project_id, err}, "error updating doc with imported bibtex"
								return next(err)
							EditorRealTimeController.emitToRoom(project_id, 'reciveNewDoc', folder_id, doc, "references-import")
							return res.send 201
