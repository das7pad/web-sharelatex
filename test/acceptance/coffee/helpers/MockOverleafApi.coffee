express = require("express")
app = express()
bodyParser = require('body-parser')

app.use(bodyParser.json())

module.exports = MockOverleafApi =
	docs: { }
	users: []

	setDoc: (doc) ->
		@docs[doc.id] = doc

	reset: () ->
		@docs = {}
		@teamExports = {}

	run: () ->

		# Project import routes
		app.post "/api/v1/sharelatex/users/:ol_user_id/docs/:ol_doc_id/export/start", (req, res, next) =>
			doc = @docs[req.params.ol_doc_id]
			if doc
				res.json doc
			else
				res.sendStatus 404

		app.post "/api/v1/sharelatex/users/:ol_user_id/docs/:ol_doc_id/export/confirm", (req, res, next) =>
      res.sendStatus 204

		app.post "/api/v1/sharelatex/users/:ol_user_id/docs/:ol_doc_id/export/cancel", (req, res, next) =>
      res.sendStatus 204

		app.get "/api/v1/sharelatex/users/:ol_user_id/docs/:ol_doc_id/export/history", (req, res, next) =>
			res.json exported: true

		app.get "/api/v1/sharelatex/users/:v1_user_id/plan_code", (req, res, next) =>
			res.json { plan_code: 'pro' }

		app.post "/api/v1/sharelatex/users/:v1_user_id/sync", (req, res, next) =>
			res.sendStatus 200

		app.get "/api/v2/users/:userId/affiliations", (req, res, next) =>
			res.json []

		app.post "/api/v1/sharelatex/login", (req, res, next) =>
			for user in @users
				if user.email == req.body.email && user.pass == req.body.pass
					return res.json {
						email: user.email,
						valid: true,
						user_profile: user.profile
					}
			return res.status(403).json {
				email: user.email,
				valid: false
			}

		v1Id = 89024583
		app.post "/api/v1/sharelatex/register", (req, res, next) =>
			for user in @users
				if user.email == req.body.email && user.pass == req.body.pass
					return res.status(409).json {
						email: user.email,
						created: false
					}
			@users.push user = {
				email: req.body.email,
				pass: req.body.pass
				profile: {
					id: v1Id++,
					email: req.body.email
				}
			}
			return res.json {
				email: user.email,
				created: true,
				user_profile: user.profile
			}

		app.listen 5000, (error) ->
			throw error if error?
		.on "error", (error) ->
			console.error "error starting MockOverleafApi:", error.message
			process.exit(1)

MockOverleafApi.run()
