settings = require("settings-sharelatex")
request = require("request")
referencesUrl = settings.apis.references?.url || "http://localhost:3023"
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
