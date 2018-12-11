MockOverleafApi = require "./helpers/MockOverleafApi"
URL = require "url"
chai = require "chai"
request = require "../../../../../test/acceptance/js/helpers/request"
settings = require "settings-sharelatex"

expect = chai.expect

describe "V2TemplatesSources", ->

	beforeEach ->
		@V1TemplateResponse = {
			 "old_versions": [
			 ],
			 "open_in_v2_links": {
				 "main": {
					 "v2": "v2_link",
					 "v1": "v1_link"
				 }
			 },
			 "pdf_links": {
				 "main": {
					 "html": "/latex/templates/gt20181127a/jhjcnnfgdrsj/viewer.html",
					 "pdf": "/latex/templates/gt20181127a/jhjcnnfgdrsj.pdf"
				 }
			 },
			 "pub": {
				 "author": "Douglas",
				 "description": "Approved V2 with public source.",
				 "doc_id": 241,
				 "published_ver_id": 19,
				 "image_url": "image_url",
				 "public_image_url": "public_url",
				 "kind": "template",
				 "license": "cc_by_4.0",
				 "meta_description": "Approved V2 with public source.",
				 "read_only_views": null,
				 "read_token": "jhjcnnfgdrsj",
				 "slug": "gt20181127a",
				 "title": "GT20181127a",
				 "zip_uri": "zip_url",
				 "show_source": true
			 },
			 "pub_tags": ["tag1", "tag2"],
			 "source": '\documentclass{article} \begin{document} \end{document}',
			 "brand_variation_id": null
		}
		MockOverleafApi.setTemplateContent(@V1TemplateResponse)
		@template_view_url = "articles/slug/read_token"
		@open_template_link_text = '>Open as Template</a>'
		@view_source_link_text = '>View Source</a>'

	describe "Open as Template button", ->
		it "shows with show_source and source", (done) ->
			request.get @template_view_url, (err, response, body) =>
				return done(err) if err?
				expect(response.statusCode).to.equal 200
				expect(response.body).to.include(@open_template_link_text)
				done()

		it "shows when show_source and no source", (done) ->
			@V1TemplateResponse.source = null
			request.get @template_view_url, (err, response, body) =>
				return done(err) if err?
				expect(response.statusCode).to.equal 200
				expect(response.body).to.include(@open_template_link_text)
				done()

		it "does not show when show_source is false", (done) ->
			@V1TemplateResponse.pub.show_source = false
			request.get @template_view_url, (err, response, body) =>
				return done(err) if err?
				expect(response.statusCode).to.equal 200
				expect(response.body).to.not.include(@open_template_link_text)
				done()

		it "does not show when show_source is null", (done) ->
			@V1TemplateResponse.pub.show_source = null
			@V1TemplateResponse.source = null
			request.get @template_view_url, (err, response, body) =>
				return done(err) if err?
				expect(response.statusCode).to.equal 200
				expect(response.body).to.not.include(@open_template_link_text)
				done()

		it "shows when show_source and zip", (done) ->
			@V1TemplateResponse.pub.source = null
			request.get @template_view_url, (err, response, body) =>
				return done(err) if err?
				expect(response.statusCode).to.equal 200
				expect(response.body).to.include(@open_template_link_text)
				done()

	describe "View Source button", ->
		it "shows with show_source and source", (done) ->
			request.get @template_view_url, (err, response, body) =>
				return done(err) if err?
				expect(response.statusCode).to.equal 200
				expect(response.body).to.include(@view_source_link_text)
				done()

		it "does not show when show_source is false", (done) ->
			@V1TemplateResponse.pub.show_source = false
			request.get @template_view_url, (err, response, body) =>
				return done(err) if err?
				expect(response.statusCode).to.equal 200
				expect(response.body).to.not.include(@view_source_link_text)
				done()

		it "does not show when show_source and no source", (done) ->
			@V1TemplateResponse.source = null
			request.get @template_view_url, (err, response, body) =>
				return done(err) if err?
				expect(response.statusCode).to.equal 200
				expect(response.body).to.not.include(@view_source_link_text)
				done()
