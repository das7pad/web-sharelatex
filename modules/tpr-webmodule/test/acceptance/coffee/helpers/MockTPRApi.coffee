express = require("express")
_ = require 'underscore'
app = express()


defaultData = () ->
	mendeley:
		groups: []
	zotero:
		bibtex: ["{testReference: 1}", ""]
		biblatex: ["{testBiblatex: 1}", ""]
	shouldError: false


module.exports = MockTPRApi =

	_data: defaultData()

	reset: (data) ->
		@_data = _.extend(defaultData(), data)

	run: () ->

		app.all "*", (req, res, next) =>
			if @_data.shouldError == true
				return res.status(500).send()
			next()

		app.get "/user/:user_id/mendeley/bibtex", (req, res, next) =>
			res.send '{testReference: 1}'

		app.get "/user/:user_id/mendeley/group/:group_id/bibtex", (req, res, next) =>
			res.send '{testReference: 1}\n{another: 2}'

		app.get "/user/:user_id/mendeley/groups", (req, res, next) =>
			res.json {user_id: req.params.user_id, groups: @_data.mendeley.groups}

		app.get "/user/:user_id/zotero/bibtex", (req, res, next) =>
			{start, format, limit} = req.query
			format ||= 'bibtex'
			start = parseInt(start) || 0
			limit = parseInt(limit) || 100
			page = parseInt(start / limit)
			res.send @_data.zotero[format][page]

		# Start Server
		app.listen 3046, (error) ->
			throw error if error?
		.on "error", (error) ->
			console.error "error starting MockTPRApi:", error.message
			process.exit(1)


MockTPRApi.run()
