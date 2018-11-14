logger = require('logger-sharelatex')
settings = require('settings-sharelatex')
mmm = require('mmmagic')
fs = require('fs')
urlValidator = require('valid-url')
FileWriter = require("../../../../app/js/infrastructure/FileWriter")
UrlHelper = require('../../../../app/js/Features/Helpers/UrlHelper')

module.exports = OpenInOverleafHelper =
	getDocumentLinesFromSnippet: (snippet) ->
		return (
			snippet.comment + OpenInOverleafHelper._normalizeMainSrcContent(snippet)
		).trim().split('\n')

	normalizeLatexContent: (content) ->
# TODO: handle non-UTF8 content and make best effort to convert.
# see: https://github.com/overleaf/write_latex/blob/master/main/lib/text_normalization.rb
		return content

	getSnippetFromUri: (uri, cb = (error, result)->) ->
		return cb(new Error('Invalid URI')) unless urlValidator.isWebUri(uri)
		uri = UrlHelper.wrapUrlWithProxy(uri)

		# TODO: Implement a file size limit here to prevent shenanigans
		FileWriter.writeUrlToDisk 'open_in_overleaf_snippet', uri, (error, fspath) ->
			return cb(error) if error?

			magic = new mmm.Magic(mmm.MAGIC_MIME_TYPE)
			magic.detectFile fspath, (error, ctype) ->
				return cb(error) if error?

				if ctype == 'application/zip'
					# TODO: Handle zip files
					cb(new Error('I need to implement zip file support'))
				else if ctype.match(/^text\//)
					# TODO: handle non-UTF8 properly
					fs.readFile fspath, encoding: 'utf8', (error, data) ->
						return cb(error) if error?
						cb(null, data)
				else
					logger.log uri:uri, ctype:ctype, "refusing to open unrecognised content type"
					cb(new Error("Invalid content type: #{ctype}"))

	_normalizeMainSrcContent: (snippet) ->
		r = OpenInOverleafHelper._wrapSnippetIfNoDocumentClass(OpenInOverleafHelper.normalizeLatexContent(snippet.snip), snippet.defaultTitle)
		return r

	_wrapSnippetIfNoDocumentClass: (content, title) ->
		unless content.match /\\documentclass/
			content = """
\\documentclass[12pt]{article}
\\usepackage[english]{babel}
\\usepackage[utf8x]{inputenc}
\\usepackage{amsmath}
\\usepackage{tikz}
\\begin{document}
\\title{#{title}}
#{content}
\\end{document}
"""
		return content
