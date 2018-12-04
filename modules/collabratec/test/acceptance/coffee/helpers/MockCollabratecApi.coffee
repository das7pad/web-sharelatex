bearerToken = require "express-bearer-token"
bodyParser = require "body-parser"
express = require "express"
fs = require "fs"
logger = require "logger-sharelatex"
sinon = require "sinon"

app = express()

app.use bodyParser.json()
app.use bodyParser.urlencoded({ extended: true })
app.use bearerToken()

module.exports = MockCollabratecApi =

	requests: []

	reset: () ->
		@requests = []

	run: () ->

		app.post "/ext/v1/document/callback/overleaf/project", (req, res) =>
			@requests.push { body: req.body, headers: req.headers }
			res.sendStatus 204

		app.listen 7000, (error) ->
			throw error if error?
		.on "error", (error) ->
			console.error "error starting MockCollabratecApi:", error.message
			process.exit(1)

MockCollabratecApi.run()
