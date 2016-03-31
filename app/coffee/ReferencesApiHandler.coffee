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

module.exports = ReferencesApiHandler =

	userCanMakeRequest: (userId, ref_provider, callback=(err, canMakeRequest)->) ->
		UserGetter.getUser userId, (err, user) ->
			callback(err, user?.features?[ref_provider] == true)

	startAuth: (req, res, next)->
		user_id = req.session?.user?._id
		ref_provider = req.params.ref_provider
		ReferencesApiHandler.userCanMakeRequest user_id, ref_provider, (err, canMakeRequest) ->
			if err
				return next(err)
			if !canMakeRequest
				return res.send 403
			opts =
				method:"get"
				url: "/user/#{user_id}/#{ref_provider}/oauth"
				json:true
			ReferencesApiHandler.make3rdRequest opts, (err, response, body)->
				if err
					next(err)
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
					next(err)
				res.redirect "/user/settings"

	make3rdRequest: (opts, callback)->
		opts.url = "#{thirdpartyUrl}#{opts.url}"
		request opts, callback

	makeRefRequest: (opts, callback)->
		opts.url = "#{referencesUrl}#{opts.url}"
		request opts, callback

	reindex: (req, res)->
		user_id = req.session?.user?._id
		project_id = req.params.project_id
		ref_provider = req.params.ref_provider
		ReferencesApiHandler.userCanMakeRequest user_id, ref_provider, (err, canMakeRequest) ->
			if err
				return next(err)
			if !canMakeRequest
				return res.send 403
			opts =
				method:"post"
				url:"/project/#{project_id}"
				json:
					referencesUrl: "#{thirdpartyUrl}/user/#{user_id}/#{ref_provider}/bibtex"


			result =
				user:
					features: {}
				reindex: false

			result.user[ref_provider] = false
			result.user.features[ref_provider] = false

			projection = {}
			projection[ref_provider] = 1
			projection['features'] = 1

			db.users.findOne _id: ObjectId(user_id), projection, (err, user)->
				result.user.features[ref_provider] = user.features[ref_provider]
				result.user[ref_provider] = user[ref_provider]?

				if !user[ref_provider]
					logger.err user_id:user_id, "has no reference info on user #{ref_provider}"
					res.json result
				else
					ReferencesApiHandler.makeRefRequest opts, (err, response, body)->

						logger.log body:body, statusCode:response.statusCode, "reference api return"
						if err? || response.statusCode == 500
							logger.err err:err, "error reindexing reference #{ref_provider}"
							res.sendStatus 500
						else
							result.reindex = true
							res.json result

	unlink: (req, res, next) ->
		ref_provider = req.params.ref_provider

		ref = {}
		ref[ref_provider] = true
		update =
			$unset: ref

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
				logger.log {user_id, ref_provider}, "got bibtex from third-party-references, returning to client"
				res.json body
