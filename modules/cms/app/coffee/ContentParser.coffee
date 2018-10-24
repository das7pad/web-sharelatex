marked = require 'marked'
sanitizeHtml = require 'sanitize-html'
Settings = require 'settings-sharelatex'

sanitizeOptions = if Settings?.modules?.sanitize?.options? then Settings.modules.sanitize.options else sanitizeHtml.defaults

module.exports = ContentParser =
	parse: (content) ->
		# Data easier to use in pug template
		content.type = content.sys?.contentType?.sys?.id

		if content.type == 'buttonOtherPage'
			if content.fields?.linkTo?.sys?.contentType?.sys?.id == 'pageAbout'
				# slug will be undefined for the about page, 
				# because we don't add this as an input the CMS
				content.href = '/about'
			else if content.fields?.linkTo?.sys?.contentType?.sys?.id == 'blogPost'
				# to do? Should we add the blog path to a setting,
				# so that this path isn't hard coded here and above for 'about'
				content.href = '/blog/' + content.fields.linkTo.fields.slug 
			else if content.fields?.linkTo?.sys?.contentType?.sys?.id == 'page'
				content.href = '/' + content.fields.linkTo.fields.path + '/' + content.fields.linkTo.fields.slug 

		# Parse markdown and stringify JSON
		if content.fields
			if content.fields.content
				content.fields.content = marked(content.fields.content)
				content.fields.content = sanitizeHtml(content.fields.content, sanitizeOptions)
			else if content.fields.footer
				content.fields.footer = marked(content.fields.footer)
				content.fields.footer = sanitizeHtml(content.fields.footer, sanitizeOptions)
			else if content.fields.tabs
				content.fields.tabs = ContentParser.parseArray(content.fields.tabs)
			else if content.fields.tabContent
				content.fields.tabContent = ContentParser.parseArray(content.fields.tabContent)
			else if content.fields.quote
				# input is a textarea but still need to parse for line breaks
				content.fields.quote = marked(content.fields.quote)
				content.fields.quote = sanitizeHtml(content.fields.quote, sanitizeOptions)
			else if content.fields.mbData
				content.fields.mbData = JSON.stringify(content.fields.mbData)

		content

	parseArray: (arr) ->
		arr.map (content, index) ->
			newRow = false # for the grid layout
			prevContent = arr[index-1] # for the grid layout

			if content && content.fields
				# Must check for fields, because an entry could have been added, but with no fields added

				# Parse markdown to HTML
				content = ContentParser.parse(content)

				# Set up grid layout - Determine if content entry should be the start of a new row
				if (!content.fields.halfWidth) || # entry is full width
						(index == 0) || # first entry / no previous
						(prevContent and !prevContent.fields.halfWidth) || # previous was full width
						(prevContent and prevContent.fields.halfWidth and !prevContent.newRow) # previous was half width but already part of a row
					newRow = true
				content.newRow = newRow
				content

		arr