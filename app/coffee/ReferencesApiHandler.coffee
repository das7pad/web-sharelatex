settings = require("settings-sharelatex")
request = require("request")
referencesUrl = settings.apis.references?.url || "http://localhost:3023"
mongojs = require "mongojs"
db = mongojs.connect(settings.mongo.url, ["users"])
ObjectId = mongojs.ObjectId
UserUpdater = require("../../../../app/js/Features/User/UserUpdater")

module.exports = ReferencesApiHandler =

	startAuth: (req, res)->
		user_id = req.session?.user?._id
		ref_provider = req.params.ref_provider
		opts =
			method:"get"
			url: "/user/#{user_id}/#{ref_provider}/oauth"
			json:true
		ReferencesApiHandler.makeRequest opts, (err, response, body)->
			console.log body, Object.keys(body)
			res.redirect(body.redirect)

	completeAuth: (req, res)->
		user_id = req.session?.user?._id
		ref_provider = req.params.ref_provider
		opts =
			method:"get"
			url: "/user/#{user_id}/#{ref_provider}/tokenexchange"
			qs:req.query
		ReferencesApiHandler.makeRequest opts, (err, response, body)->
			res.redirect "/user/settings"

	makeRequest: (opts, callback)->
		opts.url = "#{referencesUrl}#{opts.url}"
		request opts, callback

	reindex: (req, res)->
		user_id = req.session?.user?._id
		ref_provider = req.params.ref_provider
		opts =
			method:"post"
			url:"/user/#{user_id}"
			json:
				referencesUrl: "#{referencesUrl}/user/#{user_id}/#{ref_provider}/bibtex"


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
				console.log userId:user_id, "has no reference info on user" + ref_provider
				res.json result
			else
				ReferencesApiHandler.makeRequest opts, (err, response, body)->
					if err?
						console.log err:err, 'error reindexing reference' + ref_provider
						res.send 500
					else
						console.log body, 'log body'
						result.reindex = true
						res.json result

	unlink: (req, res, next) ->
		ref_provider = req.params.ref_provider

		ref = {}
		ref[ref_provider] = true
		update = 
			$unset: ref

		console.log "unlink", req.session?.user?._id, update
		UserUpdater.updateUser req.session?.user?._id, update, (err)->
			if err?
				logger.err err:err, result:result, "error unlinking reference info on user" + ref_provider
			res.redirect "/user/settings"
