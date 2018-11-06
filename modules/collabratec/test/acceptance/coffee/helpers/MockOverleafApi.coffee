express = require "express"
bearerToken = require "express-bearer-token"
bodyParser = require "body-parser"
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
			return res.json @projects[req.token] if @projects[req.token]?
			res.status(401).send()

		app.post "/api/v1/sharelatex/oauth_authorize", (req, res, next) =>
			return res.json @tokens[req.body.token] if @tokens[req.body.token]?
			res.status(401).send()

		app.listen 5000, (error) ->
			throw error if error?
		.on "error", (error) ->
			console.error "error starting MockOverleafApi:", error.message
			process.exit(1)

MockOverleafApi.run()
