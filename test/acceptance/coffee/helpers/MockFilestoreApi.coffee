express = require("express")
app = express()

module.exports = MockFileStoreApi =
	files: {}

	addFile: (project_id, file_id, stream) ->
		@files[project_id] ||= {}
		@files[project_id][file_id] ||= stream

	getFile: (project_id, file_id) ->
		@files[project_id]?[file_id]

	run: () ->
		app.post "/project/:project_id/file/:file_id", (req, res, next) =>
			{project_id, file_id} = req.params
			@addFile project_id, file_id, req
			res.send 200

		app.get "/project/:project_id/file/:file_id", (req, res, next) =>
			{project_id, file_id} = req.params
			file = @getFile project_id, file_id
			file.pipe(res)

		app.listen 3009, (error) ->
			throw error if error?
		.on "error", (error) ->
			console.error "error starting tpr-webmodule MockFileStoreApi:", error.message
			process.exit(1)

MockFileStoreApi.run()
