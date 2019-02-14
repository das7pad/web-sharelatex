settings = require("settings-sharelatex")
request = require("request")
logger = require("logger-sharelatex")
SupportDetailsManager = require("./SupportDetailsManager")
path = require("path")

inboxes = {
	"support":
		id:"inb_3wb"
		email:"support@overleaf.com"
	"accounts":
		id:"inb_bmf"
		email:"sales@overleaf.com"
	"sales":
		id:"inb_bmf"
		email:"sales@overleaf.com"
	"portals":
		id:"inb_1tu7"
		email:"sales@overleaf.com"
	}
module.exports  =

	newSupportRequest: (req, res, next)->
		{message, subject, email, about, inbox, tags = ''} = req.body
		inboxId = inboxes[inbox].id
		inboxEmail = inboxes[inbox].email
		if !inboxId?
			return res.sendStatus 500

		opts =
			url: "https://api2.frontapp.com/inboxes/#{inboxId}/imported_messages"
			headers:
				authorization: settings.front.auth_key
			method: "POST"
			json:
				body: message
				to: [inboxEmail]
				external_id: Math.random().toString()
				subject: subject
				created_at: Date.now()/1000
				sender:
					handle: email
				metadata:
					is_inbound:true
					is_archived:false
					should_skip_rules: false
				tags: [tags]


		request opts, (err, response, body)->
			if err? or response.statusCode!= 202
				logger.err err:err, body:body, statusCode: response.statusCode, "error creating support ticket"
				res.sendStatus(500)
			else
				res.sendStatus(200)

	renderInfoPanelLoader: (req, res, next)->
		if !req.query.auth_secret? or req.query.auth_secret != settings.front.auth_secret
			logger.warn "someone requested front side panel data without correct auth"
			return res.sendStatus 404
		viewPath = path.join(__dirname, "../views/user_info_panel_loader")
		res.render viewPath, sl_secure_token:settings.front.sl_secure_token

	getUserInfo: (req, res, next)->
		userEmail = req.body.email
		logger.log userEmail:userEmail, "getting request for user detail from front"

		if !settings.front.sl_secure_token? or settings.front.sl_secure_token != req.body.sl_secure_token
			logger.warn sl_secure_token:req.body.sl_secure_token, "secure token does not match for getUserInfo"
			return res.sendStatus 404

		if !userEmail?
			logger.err body:req.body, "front did not have email in query"
			return res.sendStatus 422

		SupportDetailsManager._getDetails userEmail, (err, details)->
			if err?
				logger.err err:err, "error getting support details for user"
				return res.send 500
			else if !details?._id?
				res.send("<h4>User not registered</h4>")
			else
				viewPath = path.join(__dirname, "../views/user_info_panel")
				res.render viewPath, details
