express = require("express")
app = express()
bodyParser = require('body-parser')
sinon = require 'sinon'

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

module.exports = MockOverleafApi =
	v1Id: 10000
	addV1User: (user, password='banana') ->
		@users.push {
			email: user.email,
			password: password,
			profile:
				id: @v1Id,
				email: user.email
		}
		user.v1Id = @v1Id
		@v1Id++

	docs: {}
	users: []
	historyExportVersions: {}

	setHistoryExportVersion: (docId, version) ->
		@historyExportVersions[docId] = version

	addAffiliation: sinon.stub()

	setDoc: (doc) ->
		@docs[doc.id] = doc

	reset: () ->
		@docs = {}
		@teamExports = {}
		@historyExportVersions = {}

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

		app.get "/api/v1/sharelatex/users/:ol_user_id/docs/:ol_doc_id/export/tags", (req, res, next) =>
			doc = @docs[req.params.ol_doc_id]
			if doc
				res.json tags: doc.tags || []
			else
				res.sendStatus 404

		app.get "/api/v1/sharelatex/docs/:ol_doc_id/labels", (req, res, next) =>
			doc = @docs[req.params.ol_doc_id]
			if doc
				res.json labels: doc.labels
			else
				res.sendStatus 404

		app.get "/api/v1/sharelatex/users/:v1_user_id/plan_code", (req, res, next) =>
			res.json { plan_code: 'pro' }

		app.post "/api/v1/sharelatex/users/:v1_user_id/sync", (req, res, next) =>
			res.sendStatus 200

		app.get "/api/v2/users/:userId/affiliations", (req, res, next) =>
			res.json []

		app.post "/api/v2/users/:userId/affiliations", (req, res, next) =>
			@addAffiliation(req.params.userId, req.body)
			res.sendStatus 201

		app.post "/api/v1/sharelatex/login", (req, res, next) =>
			for user in @users
				if user.email == req.body.email && user.password == req.body.password
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
				if user.email == req.body.email && user.password == req.body.password
					return res.status(409).json {
						email: user.email,
						created: false
					}
			@users.push user = {
				email: req.body.email,
				password: req.body.password
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

		app.post "/api/v1/sharelatex/change_password", (req, res, next) =>
			invalid = {
				user: req.body.user_id,
				valid: false,
			}
			for user in @users
				if user.profile.id == req.body.user_id &&
						user.password != req.body.current_password
					return res.status(403).json invalid
			if req.body.password.length < 6
				return res.status(403).json invalid
			return res.json {
				valid: true,
			}

		# collabratec
		app.get "/api/v1/sharelatex/user_collabratec_id", (req, res, next) =>
			if req.query.collabratec_id == "1111"
				res.json
					collabratec_id: "1111"
					email: "mock-user@exists.com"
					id: "88881111"
			else
				res.status(404).json {}

		app.post "/api/v1/sharelatex/user_collabratec_id", (req, res, next) =>
			if req.body.user_id == "88883333"
				res.json
					collabratec_id: req.body.collabratec_id
					email: "mock-user@email-exists.com'"
					id: "88883333"
			else
				res.status(404).json {}

		app.get "/api/v1/sharelatex/user_emails", (req, res, next) =>
			if req.query.email == "mock-user@exists.com"
				res.json
					user_id: "88881111"
			else if req.query.email == "mock-user@email-exists.com"
				res.json
					user_id: "88883333"
			else
				res.status(404).json {}

		app.post "/api/v1/sharelatex/oauth_authorize", (req, res, next) =>
			# Send back the token parameter as the user-id
			# example header:   {'Authorization': 'Bearer 42'}
			id = parseInt(req.body.token, 10)
			return res.json({
				user_profile: {id: id}
			})

		app.get "/api/v1/sharelatex/docs/:docId/history_export/status", (req, res, next) =>
			docId = req.params['docId']
			historyExportVersion = @historyExportVersions[docId]
			if !historyExportVersion?
				return res.sendStatus(500)
			return res.json {
				exported: true,
				history_export_version: historyExportVersion
			}

		app.listen 5000, (error) ->
			throw error if error?
		.on "error", (error) ->
			console.error "error starting MockOverleafApi:", error.message
			process.exit(1)

MockOverleafApi.run()
