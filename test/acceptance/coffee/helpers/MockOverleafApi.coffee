express = require("express")
app = express()

module.exports = MockOverleafApi =
	docs: { }

	setDoc: (doc) ->
		@docs[doc.id] = doc

	run: () ->
		app.post "/api/v1/sharelatex/docs/:ol_doc_id/export/start", (req, res, next) =>
			doc = @docs[req.params.ol_doc_id]
			if doc
				res.json doc
			else
				res.sendStatus 404

		app.post "/api/v1/sharelatex/docs/:ol_doc_id/export/confirm", (req, res, next) =>
      res.sendStatus 204

		app.post "/api/v1/sharelatex/docs/:ol_doc_id/export/cancel", (req, res, next) =>
      res.sendStatus 204

		app.listen 5000, (error) ->
			throw error if error?
		.on "error", (error) ->
			console.error "error starting MockOverleafApi:", error.message
			process.exit(1)

MockOverleafApi.run()
