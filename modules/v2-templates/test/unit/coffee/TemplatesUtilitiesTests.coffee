Path = require "path"
chai = require "chai"
sinon = require "sinon"
sinonChai = require "sinon-chai"
TemplatesUtilities = require(Path.resolve __dirname, "../../../app/js/TemplatesUtilities")

chai.use sinonChai
expect = chai.expect

describe "TemplatesUtilities", ->

	describe "format_template", ->
		beforeEach ->
			@doc_mock =
				read_token: "doc-read-token"
				slug: "doc-slug"

		describe "with article content", ->
			beforeEach ->
				@doc_mock.kind = "article"

			it "should have articles path", ->
				TemplatesUtilities.format_template @doc_mock
				expect(@doc_mock.path).to.equal "/articles/doc-slug/doc-read-token"

		describe "with example content", ->
			beforeEach ->
				@doc_mock.kind = "example"

			it "should have latex/examples path", ->
				TemplatesUtilities.format_template @doc_mock
				expect(@doc_mock.path).to.equal "/latex/examples/doc-slug/doc-read-token"

		describe "with template content", ->
			beforeEach ->
				@doc_mock.kind = "template"

			it "should have latex/templates path", ->
				TemplatesUtilities.format_template @doc_mock
				expect(@doc_mock.path).to.equal "/latex/templates/doc-slug/doc-read-token"
