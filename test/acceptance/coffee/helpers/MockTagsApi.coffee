express = require("express")
app = express()
bodyParser = require('body-parser')

app.use(bodyParser.json())

module.exports = MockTagsApi =

	run: () ->
		app.post "/user/:user_id/tag/project/:project_id", (req, res, next) =>
			res.sendStatus 204

		app.put "/user/:user_id/tag", (req, res, next) =>
			res.sendStatus 204

		app.listen 3012, (error) ->
			throw error if error?
		.on "error", (error) ->
			console.error "error starting MockTagsApi:", error.message
			process.exit(1)

MockTagsApi.run()
