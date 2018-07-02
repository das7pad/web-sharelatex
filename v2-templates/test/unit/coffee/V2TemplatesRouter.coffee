Path = require "path"
SandboxedModule = require "sandboxed-module"
_ = require "lodash"
expect = require("chai").expect
express = require "express"
sinon = require "sinon"
supertest = require "supertest"

describe "V2TemplatesRouter", ->

	templateControllerPath = Path.resolve __dirname, "../../../app/js/V2TemplatesController"
	templatesManagerPath = Path.resolve __dirname, "../../../app/js/V2TemplatesManager"
	templatesRouterPath = Path.resolve __dirname, "../../../app/js/V2TemplatesRouter"

	beforeEach ->
		@bodyMock =
			response: "body"
			pub:
				author: "author"
				description: "description"
				kind: "template"
			tags: [
				{ title: "title" }
			]
		@request = sinon.stub().callsArgWith(1, null, {body: @bodyMock})
		@settings =
			apis:
				v1:
					url: "overleaf.test"
		@V2TemplatesManager = SandboxedModule.require(
			templatesManagerPath,
			globals:
				console: console
			requires:
				lodash: _
				path: Path
				request: @request
				"settings-sharelatex": @settings
		)
		@V2TemplatesController = SandboxedModule.require(
			templateControllerPath,
			globals:
				console: console
			requires:
				path: Path
				"./V2TemplatesManager": @V2TemplatesManager
		)
		@V2TemplatesRouter = SandboxedModule.require(
			templatesRouterPath,
			globals:
				console: console
			requires:
				"./V2TemplatesController": @V2TemplatesController
		)

		@app = express()
		@engine = sinon.stub().callsArgWith(2, null, 'rendered')
		@app.engine('pug', @engine)
		@app.set('views', Path.resolve __dirname, "../../../app/views")
		@app.set('view engine', 'pug')
		@V2TemplatesRouter.apply(@app)
		@supertest = supertest(@app)


	describe "valid paths", ->

		validPaths = 
			"/articles": "/articles"
			"/articles/popular": "/articles/popular/page/1"
			"/articles/popular/page/1": "/articles/popular/page/1"
			"/articles/popular/page/2": "/articles/popular/page/2"
			"/articles/recent": "/articles/recent/page/1"
			"/articles/recent/page/1": "/articles/recent/page/1"
			"/articles/recent/page/2": "/articles/recent/page/2"
			"/articles/tagged/tag_name": "/articles/tagged/tag_name/page/1"
			"/articles/tagged/tag_name/page/1": "/articles/tagged/tag_name/page/1"
			"/articles/tagged/tag_name/page/2": "/articles/tagged/tag_name/page/2"
			"/articles/slug/read_token": "/latex/templates/slug/read_token"
			"/gallery": "/gallery"
			"/gallery/popular": "/gallery/popular/page/1"
			"/gallery/popular/page/1": "/gallery/popular/page/1"
			"/gallery/popular/page/2": "/gallery/popular/page/2"
			"/gallery/recent": "/gallery/recent/page/1"
			"/gallery/recent/page/1": "/gallery/recent/page/1"
			"/gallery/recent/page/2": "/gallery/recent/page/2"
			"/gallery/tagged/tag_name": "/gallery/tagged/tag_name/page/1"
			"/gallery/tagged/tag_name/page/1": "/gallery/tagged/tag_name/page/1"
			"/gallery/tagged/tag_name/page/2": "/gallery/tagged/tag_name/page/2"
			"/latex/examples": "/latex/examples"
			"/latex/examples/popular": "/latex/examples/popular/page/1"
			"/latex/examples/popular/page/1": "/latex/examples/popular/page/1"
			"/latex/examples/popular/page/2": "/latex/examples/popular/page/2"
			"/latex/examples/recent": "/latex/examples/recent/page/1"
			"/latex/examples/recent/page/1": "/latex/examples/recent/page/1"
			"/latex/examples/recent/page/2": "/latex/examples/recent/page/2"
			"/latex/examples/tagged/tag_name": "/latex/examples/tagged/tag_name/page/1"
			"/latex/examples/tagged/tag_name/page/1": "/latex/examples/tagged/tag_name/page/1"
			"/latex/examples/tagged/tag_name/page/2": "/latex/examples/tagged/tag_name/page/2"
			"/latex/examples/slug/read_token": "/latex/templates/slug/read_token"
			"/latex/templates": "/latex/templates"
			"/latex/templates/popular": "/latex/templates/popular/page/1"
			"/latex/templates/popular/page/1": "/latex/templates/popular/page/1"
			"/latex/templates/popular/page/2": "/latex/templates/popular/page/2"
			"/latex/templates/recent": "/latex/templates/recent/page/1"
			"/latex/templates/recent/page/1": "/latex/templates/recent/page/1"
			"/latex/templates/recent/page/2": "/latex/templates/recent/page/2"
			"/latex/templates/tagged/tag_name": "/latex/templates/tagged/tag_name/page/1"
			"/latex/templates/tagged/tag_name/page/1": "/latex/templates/tagged/tag_name/page/1"
			"/latex/templates/tagged/tag_name/page/2": "/latex/templates/tagged/tag_name/page/2"
			"/latex/templates/slug/read_token": "/latex/templates/slug/read_token"

		for reqPath, apiPath of validPaths
			it "should get #{reqPath}", ((reqPath, apiPath) ->
				return () ->
					return @supertest.get(reqPath).expect(200).then =>
						expect(
							@request.firstCall.args[0].uri
						).to.equal "overleaf.test#{apiPath}"
			)(reqPath, apiPath)

