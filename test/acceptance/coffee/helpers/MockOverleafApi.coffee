express = require("express")
app = express()

module.exports = MockOverleafApi =
	docs: { }

	files: { }

	setDoc: (doc) ->
		@docs[doc.id] = doc

	setFile: (file) ->
		@files[file.id] = file.path

	run: () ->
		app.get "/api/v1/sharelatex/docs/:ol_doc_id", (req, res, next) =>
			doc = @docs[req.params.ol_doc_id]
			if doc
				res.json doc
			else
				res.sendStatus 404

		app.put "/api/v1/sharelatex/docs/:ol_doc_id", (req, res, next) =>
      res.sendStatus 204

		app.get "/file/:file_id", (req, res, next) =>
			file = @files[req.params.file_id]
			if file
				file.stream.pipe(res)
			else
				res.sendStatus 404

		app.listen 5000, (error) ->
			throw error if error?
		.on "error", (error) ->
			console.error "error starting MockOverleafApi:", error.message
			process.exit(1)

MockOverleafApi.run()
