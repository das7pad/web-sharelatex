express = require("express")
app = express()

module.exports = MockTPRApi =
	run: () ->
		app.post "/user/:user_id/:ref_provider/bibtex", (req, res, next) =>
			res.send '{testReference: 1}'

		app.listen 3046, (error) ->
			throw error if error?
		.on "error", (error) ->
			console.error "error starting MockTPRApi:", error.message
			process.exit(1)

MockTPRApi.run()
