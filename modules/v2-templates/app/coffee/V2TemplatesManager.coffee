Path = require "path"
URL = require "url"
_ = require "lodash"
request = require "request"
settings = require "settings-sharelatex"
Errors = require "../../../../app/js/Features/Errors/Errors"
TemplatesUtilities = require "../../../v2-templates/app/js/TemplatesUtilities"

LICENSES = {
    "cc_by_4.0" : "Creative Commons CC BY 4.0",
    "lppl_1.3c" : "LaTeX Project Public License 1.3c",
    "other" : "Other (as stated in the work)",
  }

content_types =
	article:
		item_name: "Article"
		path: "/articles"
		summary: "Papers, presentations, reports and more, written in LaTeX and published by our community. Search or browse below."
		page_title: "Articles"
		tagged_title: "Articles"
		title: "Articles - Papers, Presentations, Reports and more"
	example:
		item_name: "Example"
		path: "/latex/examples"
		summary: "Examples of powerful LaTeX packages and techniques in use — a great way to learn LaTeX by example. Search or browse below."
		page_title: "Examples"
		tagged_title: "Examples"
		title: "Examples - Equations, Formatting, TikZ, Packages and More"
	gallery:
		item_name: "Gallery Item"
		path: "/gallery"
		summary: "A gallery of up-to-date and stylish LaTeX templates, examples to help you learn LaTeX, and papers and presentations published by our community. Search or browse below."
		page_title: "All"
		tagged_title: "Gallery"
		title: "Gallery - Templates, Examples and Articles written in LaTeX"
	template:
		item_name: "Template"
		path: "/latex/templates"
		summary: "Start your projects with quality LaTeX templates for journals, CVs, resumes, papers, presentations, assignments, letters, project reports, and more. Search or browse below."
		page_title: "Templates"
		tagged_title: "Templates"
		title: "Templates - Journals, CVs, Presentations, Reports and More"

pagination_max_pages = 4

module.exports = V2TemplatesManager =

	RedirectError: (statusCode, location) ->
		error = new Error "redirect"
		error.name = "RedirectError"
		error.__proto__ = V2TemplatesManager.RedirectError.prototype
		error.statusCode = statusCode
		url = URL.parse location
		error.location = url.path
		return error

	getPage: (content_type_name, callback) ->
		content_type = content_types[content_type_name]
		return callback new Error "invalid content_type_name" if !content_type?
		V2TemplatesManager._get content_type.path, (err, page) ->
			return callback err if err
			V2TemplatesManager._formatIndexData page, content_type.path, content_type.path
			Object.assign page, content_type
			callback null, page

	getPagePaginated: (content_type_name, segment, page_num, callback) ->
		content_type = content_types[content_type_name]
		return callback new Error "invalid content_type_name" if !content_type?
		V2TemplatesManager._get "#{content_type.path}/#{segment}/page/#{page_num}", (err, page) ->
			return callback err if err
			V2TemplatesManager._formatIndexData page, content_type.path, content_type.path
			Object.assign page, content_type
			page.hide_segment_title = true
			page.page_title = "#{content_type.tagged_title} — #{_.capitalize segment}"
			callback null, page

	getPageTagged: (content_type_name, tag_name, page_num, callback) ->
		content_type = content_types[content_type_name]
		return callback new Error "invalid content_type_name" if !content_type?
		page_path = "#{content_type.path}/tagged/#{tag_name}"
		V2TemplatesManager._get "#{page_path}/page/#{page_num}", (err, page) ->
			return callback err if err
			return callback new Error "invalid response" unless page?.tags?
			V2TemplatesManager._formatIndexData page, content_type.path, page_path
			Object.assign page, content_type
			page.tag = page.tags[0]
			page.page_title = "#{page.tagged_title} — #{page.tag.title}"
			page.summary = page.tag.top_html
			callback null, page

	getTemplate: (slug, read_token, callback) ->
		V2TemplatesManager._get "/latex/templates/#{slug}/#{read_token}", (err, page) ->
			return callback err if err
			return callback new Error "invalid response" unless page?.pub?
			content_type = content_types[page.pub.kind]
			return callback new Error "invalid page.kind" if !content_type
			V2TemplatesManager._formatTemplateData page, content_type
			# metadata
			page.metadata = {
				description: page.pub?.meta_description
				image_src: page.pub?.public_image_url
				viewport: true
			}
			callback null, page


	_formatDocsData: (page, docs_property, page_path) ->
		return unless page["#{docs_property}_docs"]
		for doc in page["#{docs_property}_docs"]
			doc = TemplatesUtilities.format_template(doc)
		if page["#{docs_property}_docs_pages"]?.total_pages > 1
			if docs_property == "popular" or docs_property == "recent"
				page_path = "#{page_path}/#{docs_property}"
			page["#{docs_property}_docs_pagination"] = V2TemplatesManager._paginate page["#{docs_property}_docs_pages"], page_path

	_formatIndexData: (page, base_path, page_path) ->
		for docs_property in ["popular", "recent", "tagged"]
			V2TemplatesManager._formatDocsData(page, docs_property, page_path)
		for tags_property in ["tags", "related_tags"]
			V2TemplatesManager._formatTagsData(page, tags_property, base_path)

	_formatTagsData: (page, tags_property, base_path) ->
		return unless page[tags_property]
		for tag in page[tags_property]
			tag.path = "#{base_path}/tagged/#{tag.name}"

	_formatTemplateData: (page, content_type) ->
		page.meta = page.pub.meta_description
		page.title = page.pub.title
		page.find_more =
			href: content_type.path
			text: "Find More #{content_type.page_title}"
		page.pub.license = LICENSES[page.pub.license]
		page.pub.pdf_url = settings.apis.v1.url + page.pdf_links.main.pdf
		if page.pub_tags
			for idx, tag of page.pub_tags
				tag.path = "/gallery/tagged/#{tag.name}"
		if page.old_versions
			for idx, old_version of page.old_versions
				old_version.open_link = page.open_in_v2_links?[old_version.id]?.v2

	_get: (url, callback) ->
		httpRequest =
			followRedirect: false
			headers:
				Accept: "application/json"
			json: true
			uri: settings.apis.v1.url+url

		request httpRequest, (err, httpResponse) ->
			if err?
				callback err
			else if httpResponse.statusCode in [301, 302]
				callback new V2TemplatesManager.RedirectError httpResponse.statusCode, httpResponse.headers.location
			else if httpResponse.statusCode == 404
				callback new Errors.NotFoundError('Template not found')
			else if httpResponse.statusCode >= 300
				# Handle HTTP errors. E.g. staging v1 has basic auth
				callback new Error('Error fetching from v1')
			else
				callback null, httpResponse.body

	_paginate: (pages, page_path) ->
		pagination = []
		if pages.current_page > 1
			pagination.push(
				href: page_path
				text: "« First"
			)
			pagination.push(
				href: page_path
				rel: "prev"
				text: "‹ Prev"
			)
			page_num = Math.max(pages.current_page - pagination_max_pages, 1)
			if pages.current_page - pagination_max_pages > 1
				pagination.push(
					text: "…"
				)
			while page_num < pages.current_page
				pagination.push(
					href: "#{page_path}/page/#{page_num}"
					text: "#{page_num}"
				)
				page_num++

		pagination.push(
			active: true
			text: "#{pages.current_page}"
		)

		if pages.current_page < pages.total_pages
			page_num = 1
			while page_num <= pagination_max_pages and pages.current_page + page_num <= pages.total_pages
				pagination.push(
					href: "#{page_path}/page/#{pages.current_page + page_num}"
					text: "#{pages.current_page + page_num}"
				)
				page_num++
			if pages.current_page + page_num <= pages.total_pages
				pagination.push(
					text: "…"
				)
			pagination.push(
				href: "#{page_path}/page/#{pages.current_page+1}"
				rel: "next"
				text: "Next ›"
			)
			pagination.push(
				href: "#{page_path}/page/#{pages.total_pages}"
				text: "Last »"
			)

		return pagination

V2TemplatesManager.RedirectError.prototype.__proto__ = Error.prototype
