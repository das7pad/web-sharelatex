settings = require("settings-sharelatex")
request = require("request")
logger = require("logger-sharelatex")
SupportDetailsManager = require("./SupportDetailsManager")
path = require("path")
OneTimeTokenHandler = require("../../../../app/js/Features/Security/OneTimeTokenHandler")

SECURE_REQUEST = "IS_SECURE_REQUEST"

module.exports  =

	newSupportRequest: (req, res, next)->
		{message, subject, email, about} = req.body
		opts =
			url: "https://api2.frontapp.com/channels/cha_43oh/messages"
			headers:
				authorization: settings.front.auth_key
			method: "POST"
			json:
				body: message
				to:[email]
				subject: subject

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
		OneTimeTokenHandler.getNewToken SECURE_REQUEST, (err, secure_token)->
			viewPath = path.join(__dirname, "../views/user_info_panel_loader")
			res.render viewPath, secure_token:secure_token

	getUserInfo: (req, res, next)->
		userEmail = req.body.email
		logger.log userEmail:userEmail, "getting request for user detail from front"

		if !userEmail?
			logger.err query:req.query , "front did not have email in query"
			return res.send 404

		OneTimeTokenHandler.getValueFromTokenAndExpire req.body.secure_token, (err, value)->
			if value != SECURE_REQUEST
				logger.warn value:value, "secure token does not match for getUserInfo"
				return res.send(404)

			SupportDetailsManager._getDetails userEmail, (err, details)->
				if err?
					return res.send 500
				else if !details._id?
					res.send("<h4>User not registered</h4>")
				else
					viewPath = path.join(__dirname, "../views/user_info_panel")
					res.render viewPath, details
