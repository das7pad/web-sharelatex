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
			data = ""
			req.resume()
			req.on 'data', (chunk) ->
				data += chunk.toString()
			req.on 'end', () =>
				@addFile project_id, file_id, data
				res.send 200

		app.get "/project/:project_id/file/:file_id", (req, res, next) =>
			{project_id, file_id} = req.params
			data = @getFile project_id, file_id
			res.send data

		app.listen 3009, (error) ->
			throw error if error?
		.on "error", (error) ->
			console.error "error starting tpr-webmodule MockFileStoreApi:", error.message
			process.exit(1)

MockFileStoreApi.run()
