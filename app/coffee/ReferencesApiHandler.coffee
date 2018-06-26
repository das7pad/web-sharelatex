_ = require 'underscore'
fs = require 'fs'
logger = require "logger-sharelatex"
mongojs = require "mongojs"
request = require "request"
settings = require "settings-sharelatex"
temp = require 'temp'

thirdpartyUrl = settings.apis.thirdpartyreferences?.url || "http://localhost:3046"
db = mongojs(settings.mongo.url, ["users"])
ObjectId = mongojs.ObjectId

AuthenticationController = require('../../../../app/js/Features/Authentication/AuthenticationController')
EditorController = require('../../../../app/js/Features/Editor/EditorController')
UserGetter = require('../../../../app/js/Features/User/UserGetter')
UserUpdater = require("../../../../app/js/Features/User/UserUpdater")

module.exports = ReferencesApiHandler =
	_getRefProviderBackendKey: (req) ->
		ref_provider = req.params.ref_provider
		if settings.apis.thirdpartyreferences?.providers?[ref_provider]?
			ref_provider = settings.apis.thirdpartyreferences.providers[ref_provider]
		return ref_provider

	userCanMakeRequest: (userId, ref_provider, callback=(err, canMakeRequest)->) ->
		UserGetter.getUser userId, (err, user) ->
			return callback(err) if err?
			features = user?.features
			callback(null, features.mendeley or features?.references)

	startAuth: (req, res, next)->
		user_id = AuthenticationController.getLoggedInUserId(req)
		ref_provider = ReferencesApiHandler._getRefProviderBackendKey(req)
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
		user_id = AuthenticationController.getLoggedInUserId(req)
		ref_provider = ReferencesApiHandler._getRefProviderBackendKey(req)
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

	unlink: (req, res, next) ->
		ref_provider = ReferencesApiHandler._getRefProviderBackendKey(req)
		user_id = AuthenticationController.getLoggedInUserId(req)

		opts =
				method: "delete"
				url: "/user/#{user_id}/#{ref_provider}"
		ReferencesApiHandler.make3rdRequest opts, (err, response, body)->
			return next(err) if error?
			logger.log {user_id, ref_provider}, "unlink complete"
			res.redirect "/user/settings"

	bibtex: (req, res, next) ->
		user_id = AuthenticationController.getLoggedInUserId(req)
		ref_provider = ReferencesApiHandler._getRefProviderBackendKey(req)
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

	groups: (req, res, next) ->
		user_id = AuthenticationController.getLoggedInUserId(req)
		ref_provider = ReferencesApiHandler._getRefProviderBackendKey(req)
		ReferencesApiHandler.userCanMakeRequest user_id, ref_provider, (err, canMakeRequest) ->
			if err
				return next(err)
			if !canMakeRequest
				return res.send 403
			opts =
				method:"get"
				url: "/user/#{user_id}/#{ref_provider}/groups"
				json: true
			logger.log {user_id, ref_provider}, "getting groups from third-party-references"
			ReferencesApiHandler.make3rdRequest opts, (err, response, body)->
				if err
					logger.err {user_id, ref_provider}, "error getting groups from third-party-references"
					return next(err)
				if 200 <= response.statusCode < 300
					logger.log {user_id, ref_provider}, "got groups from third-party-references, returning to client"
					res.json body
				else
					logger.log {user_id, ref_provider, statusCode:response.statusCode}, "error code from remote api"
					res.send response.statusCode

	make3rdRequestStream: (opts)->
		opts.url = "#{thirdpartyUrl}#{opts.url}"
		logger.log {url: opts.url}, 'making request to third-party-references api'
		stream = request opts
		return stream

	importBibtex: (req, res, next) ->
		user_id = AuthenticationController.getLoggedInUserId(req)
		ref_provider = ReferencesApiHandler._getRefProviderBackendKey(req)
		project_id = req.params.Project_id
		ReferencesApiHandler.userCanMakeRequest user_id, ref_provider, (err, canMakeRequest) ->
			if err
				return next(err)
			if !canMakeRequest
				return res.sendStatus 403
			opts =
				method:"get"
				url: "/user/#{user_id}/#{ref_provider}/bibtex"
			logger.log {user_id, ref_provider, project_id}, "importing bibtex from third-party-references"
			# get the bibtex from remote api
			tempWriteStream = temp.createWriteStream()
			tempFilePath = tempWriteStream.path
			requestStream = ReferencesApiHandler.make3rdRequestStream opts
			# always clean up the temp file
			_cleanup = _.once(
				(cb) ->
					tempWriteStream.destroy()
					fs.unlink tempFilePath, (err) ->
						if err?
							logger.err {tempFilePath, err}, "error removing file after streaming references"
							next(err)
						else
							cb(null)
			)
			requestStream.on 'error', (err) ->
				logger.err {err, user_id, project_id, ref_provider}, "error streaming bibtex from third-party-references"
				_cleanup () ->
					return next(err)
			requestStream.on 'end', (err) ->
				filePath = "/#{ref_provider}.bib"
				EditorController.upsertFileWithPath project_id, filePath, tempFilePath, null, "references-import", user_id, (err) ->
					_cleanup () ->
						if err?
							logger.err {err, user_id, ref_provider, project_id, tempFilePath}, "could not add bibtex file"
							next err
						else
							res.sendStatus 201

			requestStream.pipe tempWriteStream
