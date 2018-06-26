express = require("express")
_ = require 'underscore'
app = express()


defaultData = () ->
	{groups: [], shouldError: false}


module.exports = MockTPRApi =

	_data:
		groups: []
		shouldError: false

	reset: (data) ->
		@_data = _.extend(defaultData(), data)

	run: () ->

		app.all "*", (req, res, next) =>
			if @_data.shouldError == true
				return res.status(500).send()
			next()

		app.get "/user/:user_id/:ref_provider/bibtex", (req, res, next) =>
			res.send '{testReference: 1}'

		app.get "/user/:user_id/:ref_provider/group/:group_id/bibtex", (req, res, next) =>
			res.send '{testReference: 1}\n{another: 2}'

		app.get "/user/:user_id/mendeley/groups", (req, res, next) =>
			res.json {user_id: req.params.user_id, groups: @_data.groups}

		# Start Server
		app.listen 3046, (error) ->
			throw error if error?
		.on "error", (error) ->
			console.error "error starting MockTPRApi:", error.message
			process.exit(1)


MockTPRApi.run()
