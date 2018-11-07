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

	projects: {}
	tokens: {}

	addToken: (token, auth) ->
		@tokens[token] = auth

	addProjects: (token, projects) ->
		@projects[token] = projects

	reset: () ->
		@tokens = {}
		@projects = {}

	run: () ->

		app.post "/api/v1/sharelatex/login", (req, res, next) =>
			return res.json {
				email: req.body.email
				valid: true
				user_profile:
					id: 1
					email: req.body.email
			}

		app.get "/api/v1/collabratec/users/current_user/projects", (req, res, next) =>
			return res.json { projects: @projects[req.token] } if @projects[req.token]?
			res.status(401).send()

		app.get "/api/v1/collabratec/users/current_user/projects/:project_id/metadata", (req, res, next) =>
			return res.status(401).send() unless @projects[req.token]?
			project = @projects[req.token].find((project) ->
				return project.id == req.params.project_id
			)
			return res.status(404).send() unless project
			res.json project

		app.post "/api/v1/sharelatex/oauth_authorize", (req, res, next) =>
			return res.json @tokens[req.body.token] if @tokens[req.body.token]?
			res.status(401).send()

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
					return res.sendStatus(500) 
				res.set("Content-Type", "application/zip")
				res.send(data)

		app.listen 5000, (error) ->
			throw error if error?
		.on "error", (error) ->
			console.error "error starting MockOverleafApi:", error.message
			process.exit(1)

MockOverleafApi.run()
