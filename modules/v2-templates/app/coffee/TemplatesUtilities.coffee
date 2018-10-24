sanitizeHtml = require 'sanitize-html'
sanitizeOptionsNoTags = { allowedTags: [], allowedAttributes: [] }

module.exports = TemplatesUtilities =
	format_template: (template) ->
		# doc path
		if template.kind == "article"
			template.path = "/articles/#{template.slug}/#{template.read_token}"
		else
			template.path = "/latex/#{template.kind}s/#{template.slug}/#{template.read_token}"

		# plain text description for list pages
		template.description_plain = sanitizeHtml(template.description, sanitizeOptionsNoTags)

		template
