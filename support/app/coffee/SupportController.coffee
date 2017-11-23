settings = require("settings-sharelatex")
request = require("request")
logger = require("logger-sharelatex")

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
