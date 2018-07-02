Path = require "path"
_ = require "lodash"
request = require "request"
settings = require "settings-sharelatex"

overleafHost = settings.apis.v1.url

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

module.exports = V2TemplatesManager =

	formatDocPath: (doc) ->
		if doc.kind == "article"
			doc.path = "/articles/#{doc.slug}/#{doc.read_token}"
		else
			doc.path = "/latex/#{doc.kind}s/#{doc.slug}/#{doc.read_token}"

	formatIndexData: (page, base_path, page_path) ->
		if page.popular_docs
			for idx, doc of page.popular_docs
				doc.path = V2TemplatesManager.formatDocPath doc
			if page.popular_docs_pages?.total_pages > 1
				page.popular_docs_pagination = V2TemplatesManager.paginate page.popular_docs_pages, "#{page_path}/popular"
		if page.recent_docs
			for idx, doc of page.recent_docs
				doc.path = V2TemplatesManager.formatDocPath doc
			if page.recent_docs_pages?.total_pages > 1
				page.recent_docs_pagination = V2TemplatesManager.paginate page.recent_docs_pages, "#{page_path}/recent"
		if page.tagged_docs
			for idx, doc of page.tagged_docs
				doc.path = V2TemplatesManager.formatDocPath doc
			if page.tagged_docs_pages?.total_pages > 1
				page.tagged_docs_pagination = V2TemplatesManager.paginate page.tagged_docs_pages, "#{page_path}"
		if page.tags
			for idx, tag of page.tags
				tag.path = "#{base_path}/tagged/#{tag.name}"
		if page.related_tags
			for idx, tag of page.related_tags
				tag.path = "#{base_path}/tagged/#{tag.name}"

	formatTemplateData: (page, content_type) ->
		page.pub.author_text = page.pub.author.replace(/<[^>]+>/g, '')
		page.pub.description_text = page.pub.description.replace(/<[^>]+>/g, '')
		page.meta = _.truncate(page.pub.description_text,
			length: 160
			omission: '...'
		)
		page.title = page.pub.title
		page.find_more =
			href: content_type.path
			text: "Find More #{content_type.page_title}"
		if page.pub_tags
			for idx, tag of page.pub_tags
				tag.path = "/gallery/tagged/#{tag.name}"
		if page.old_versions
			for idx, old_version of page.old_versions
				old_version.open_link = page.open_in_v2_links?[old_version.id]?.v2

	get: (url, callback) ->
		httpRequest =
			headers:
				Accept: "application/json"
			json: true
			uri: overleafHost+url

		request httpRequest, (err, httpResponse) ->
			if err?
				callback err
			else
				callback null, httpResponse.body

	getPage: (content_type_name, callback) ->
		content_type = content_types[content_type_name]
		return callback new Error "invalid content_type_name" if !content_type
		V2TemplatesManager.get content_type.path, (err, page) ->
			return callback err if err
			V2TemplatesManager.formatIndexData page, content_type.path, content_type.path
			Object.assign page, content_type
			callback null, page

	getPagePaginated: (content_type_name, segment, page_num, callback) ->
		content_type = content_types[content_type_name]
		return callback new Error "invalid content_type_name" if !content_type
		V2TemplatesManager.get "#{content_type.path}/#{segment}/page/#{page_num}", (err, page) ->
			return callback err if err
			V2TemplatesManager.formatIndexData page, content_type.path, content_type.path
			Object.assign page, content_type
			page.hide_segment_title = true
			page.page_title = "#{content_type.tagged_title} — #{_.capitalize segment}"
			callback null, page

	getPageTagged: (content_type_name, tag_name, page_num, callback) ->
		content_type = content_types[content_type_name]
		return callback new Error "invalid content_type_name" if !content_type
		page_path = "#{content_type.path}/tagged/#{tag_name}"
		V2TemplatesManager.get "#{page_path}/page/#{page_num}", (err, page) ->
			return callback err if err
			V2TemplatesManager.formatIndexData page, content_type.path, page_path
			Object.assign page, content_type
			page.tag = page.tags[0]
			page.page_title = "#{page.tagged_title} — #{page.tag.title}"
			page.summary = page.tag.top_html
			callback null, page

	getTemplate: (slug, read_token, callback) ->
		V2TemplatesManager.get "/latex/templates/"+slug+"/"+read_token, (err, page) ->
			return callback err if err
			content_type = content_types[page.pub.kind]
			return callback new Error "invalid page.kind" if !content_type
			V2TemplatesManager.formatTemplateData page, content_type
			callback null, page

	paginate: (pages, page_path) ->
		pagination = []
		if pages.current_page > 1
			pagination.push(
				href: page_path
				text: "« First"
			)
			if pages.current_page > 2
				pagination.push(
					href: page_path
					rel: "prev"
					text: "‹ Prev"
				)
			else
				pagination.push(
					href: page_path
					rel: "prev"
					text: "‹ Prev"
				)
			page_num = Math.max(pages.current_page - 4, 1)
			if pages.current_page - 4 > 1
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
			while page_num < 5 and pages.current_page + page_num <= pages.total_pages
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
