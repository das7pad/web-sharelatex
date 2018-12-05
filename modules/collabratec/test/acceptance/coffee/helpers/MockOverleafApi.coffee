bearerToken = require "express-bearer-token"
bodyParser = require "body-parser"
express = require "express"
fs = require "fs"
logger = require "logger-sharelatex"
sinon = require "sinon"

app = express()

app.use bodyParser.json()
app.use bodyParser.urlencoded({ extended: true })
app.use bearerToken()

module.exports = MockOverleafApi =
	collabratec_users: {}
	projects: {}
	tokens: {}

	addCollabratecUser: (collabretec_id, user_id) ->
		@collabratec_users[collabretec_id] = user_id

	addToken: (token, auth) ->
		@tokens[token] = auth

	addProjects: (token, projects) ->
		@projects[token] = projects

	reset: () ->
		@collabratec_users = {}
		@tokens = {}
		@projects = {}

	run: () ->

		app.post "/api/v1/sharelatex/login", (req, res) =>
			return res.json {
				email: req.body.email
				valid: true
				user_profile:
					id: 1
					email: req.body.email
			}

		app.get "/api/v1/sharelatex/user_collabratec_id", (req, res) =>
			return res.json { id: @collabratec_users[req.query.collabratec_id] } if @collabratec_users[req.query.collabratec_id]?
			res.sendStatus 404

		app.get "/api/v1/collabratec/users/current_user/projects", (req, res) =>
			return res.json { projects: @projects[req.token] } if @projects[req.token]?
			res.sendStatus 401

		app.get "/api/v1/collabratec/users/current_user/projects/:project_id/metadata", (req, res) =>
			return res.sendStatus 404 unless @projects[req.token]?
			project = @projects[req.token].find((project) ->
				return project.id == req.params.project_id
			)
			return res.sendStatus 404 unless project
			res.json project

		app.post "/api/v1/sharelatex/oauth_authorize", (req, res) =>
			return res.json @tokens[req.body.token] if @tokens[req.body.token]?
			res.sendStatus 401

		app.get "/latex/templates/-/valid-template-id", (req, res) ->
			res.json({
				pub:
					doc_id: 11,
					published_ver_id: 11
			})

		app.get "/api/v1/sharelatex/templates/11", (req, res, next) ->
			fs.readFile "#{__dirname}/../../files/test-template.zip", (err, data) ->
				if err?
					logger.error { err }, "error reading template file"
					return res.sendStatus 500
				res.set("Content-Type", "application/zip")
				res.send(data)

		app.delete "/api/v1/collabratec/users/current_user/projects/good-project-id", (req, res) ->
			res.sendStatus 204

		app.delete "/api/v1/collabratec/users/current_user/projects/bad-project-id", (req, res) ->
			res.sendStatus 422

		app.post "/api/v1/collabratec/users/current_user/projects/good-project-id/collabratec", (req, res) ->
			res.status(201).json({project: "data"})

		app.post "/api/v1/collabratec/users/current_user/projects/bad-project-id/collabratec", (req, res) ->
			res.sendStatus 422

		app.delete "/api/v1/collabratec/users/current_user/projects/good-project-id/collabratec", (req, res) ->
			res.sendStatus 204

		app.delete "/api/v1/collabratec/users/current_user/projects/bad-project-id/collabratec", (req, res) ->
			res.sendStatus 403

		app.post "/api/v1/collabratec/users/current_user/projects/good-project-id/clone", (req, res) ->
			res.status(201).json({project: "data"})

		app.post "/api/v1/collabratec/users/current_user/projects/bad-project-id/clone", (req, res) ->
			res.sendStatus 422

		app.listen 5000, (error) ->
			throw error if error?
		.on "error", (error) ->
			console.error "error starting MockOverleafApi:", error.message
			process.exit(1)

MockOverleafApi.run()
