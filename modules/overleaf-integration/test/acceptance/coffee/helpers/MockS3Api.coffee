express = require("express")
app = express()

module.exports = MockS3Api =
	files: {}

	setFile: (file) ->
		@files[file.id.toString()] = file

	run: () ->
		app.get "/file/:file_id", (req, res, next) =>
			file = @files[req.params.file_id]
			if file
				file.stream.pipe(res)
			else
				res.sendStatus 404

		app.use (error, req, res, next) ->
			throw error

		app.listen 5001, (error) ->
			throw error if error?

MockS3Api.run()
