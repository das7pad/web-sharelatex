settings = require("settings-sharelatex")
request = require("request")
logger = require("logger-sharelatex")
SupportDetailsManager = require("./SupportDetailsManager")
path = require("path")
OneTimeTokenHandler = require("../../../../app/js/Features/Security/OneTimeTokenHandler")

inboxes = {
	"support":"cha_43oh"
	"accounts":"cha_4081"
}
module.exports  =

	newSupportRequest: (req, res, next)->
		{message, subject, email, about, inbox} = req.body
		inboxId = inboxes[inbox]
		if !inboxId?
			return res.sendStatus 500
		opts =
			url: "https://api2.frontapp.com/channels/#{inboxId}/messages"
			headers:
				authorization: settings.front.auth_key
			method: "POST"
			json:
				body: message
				to:[email]
				subject: subject
				options:
					archive:false
		request opts, (err, response, body)->
			if err? or response.statusCode!= 202
				logger.err err:err, body:body, statusCode: res.statusCode, "error creating support ticket"
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
			logger.err query:req.query , "front did not have email in query"
			return res.sendStatus 422

		SupportDetailsManager._getDetails userEmail, (err, details)->
			if err?
				return res.send 500
			else if !details._id?
				res.send("<h4>User not registered</h4>")
			else
				viewPath = path.join(__dirname, "../views/user_info_panel")
				res.render viewPath, details
