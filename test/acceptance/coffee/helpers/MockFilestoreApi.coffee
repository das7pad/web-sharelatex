express = require("express")
app = express()

module.exports = MockFileStoreApi =
	run: () ->
		app.post "/project/:project_id/file/:file_id", (req, res, next) =>
			res.sendStatus 200

		app.listen 3009, (error) ->
			throw error if error?
		.on "error", (error) ->
			console.error "error starting MockFileStoreApi:", error.message
			process.exit(1)

MockFileStoreApi.run()
