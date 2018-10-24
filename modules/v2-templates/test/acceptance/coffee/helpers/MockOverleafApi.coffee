express = require("express")
app = express()
bodyParser = require('body-parser')
sinon = require 'sinon'

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

module.exports = MockOverleafApi =

	run: () ->

		app.get "/latex/templates/-/redirect-article", (req, res, next) =>
			res.json _mockTemplate( open_in_v2_links: main: v2: '/redirect' )

		app.listen 5000, (error) ->
			throw error if error?
		.on "error", (error) ->
			console.error "error starting MockOverleafApi:", error.message
			process.exit(1)

MockOverleafApi.run()

_mockTemplate = (data) ->
	return Object.assign({}, {
		pdf_links:
			main:
				pdf: "/pdf"
		pub:
			kind: "template"
	}, data)