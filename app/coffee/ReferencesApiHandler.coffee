settings = require("settings-sharelatex")
request = require("request")
referencesUrl = settings.apis.references?.url || "http://localhost:3023"
mongojs = require "mongojs"
db = mongojs.connect(settings.mongo.url, ["users"])
ObjectId = mongojs.ObjectId

module.exports = ReferencesApiHandler =

	startAuth: (req, res)->
		user_id = req.session?.user?._id
		opts =
			method:"get"
			url: "/user/#{user_id}/mendeley/oauth"
			json:true
		ReferencesApiHandler.makeRequest opts, (err, response, body)->
			console.log body, Object.keys(body)
			res.redirect(body.redirect)

	completeAuth: (req, res)->
		user_id = req.session?.user?._id
		opts =
			method:"get"
			url: "/user/#{user_id}/mendeley/tokenexchange"
			qs:req.query
		ReferencesApiHandler.makeRequest opts, (err, response, body)->
			res.redirect "/user/settings"

	makeRequest: (opts, callback)->
		opts.url = "#{referencesUrl}#{opts.url}"
		request opts, callback

	reindex: (req, res)->
		user_id = req.session?.user?._id
		opts =
			method:"post"
			url:"/user/#{user_id}"
			json:
				referencesUrl: "#{referencesUrl}/user/#{user_id}/mendeley/bibtex"

		result =
			user: 
				features:
					mendeley: false
				mendeley: false
			reindex: false

		db.users.findOne _id: ObjectId(user_id), {mendeley:1,features:1}, (err, user)->
			result.user.features.mendeley = user.features.mendeley
			result.user.mendeley = user.mendeley?

			if !user.mendeley
				console.log userId:user_id, "has no mendeley info on user"
				res.json result
			else
				ReferencesApiHandler.makeRequest opts, (err, response, body)->
					if err?
						console.log err:err, 'error reindexing mendeley'
						res.send 500
					else
						console.log body, 'log body'
						result.reindex = true
						res.json result



