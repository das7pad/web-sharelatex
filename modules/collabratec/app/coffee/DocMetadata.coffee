module.exports = DocMetadata =

	extractAbstractRegExp: /\\begin\s*{abstract}(.+?)\\end\s*{abstract}/
	extractAuthorRegExp: /\\[aA]uthor\s*{([^},]+)[,}]/
	extractIEEEKeywordsRegExp: /\\begin\s*{IEEEkeywords}(.+?)\\end\s*{IEEEkeywords}/
	extractKeywordsRegExp: /\\begin\s*{keywords}(.+?)\\end\s*{keywords}/

	injectAbstractRegExp: /\\begin\s*{abstract}\s*([\s\S]+?)\s*\\end\s*{abstract}/
	injectIEEEKeywordsRegExp: /\\begin\s*{IEEEkeywords}\s*([\s\S]+?)\s*\\end\s*{IEEEkeywords}/
	injectKeywordsRegExp: /\\begin\s*{keywords}\s*([\s\S]+?)\s*\\end\s*{keywords}/
	injectTitleRegExp: /^\s*\\title{(.+)}\s*$/m

	abstractFromContent: (content) ->
		matches = content.match DocMetadata.extractAbstractRegExp
		return unless matches
		return matches[1].trim()

	contentFromLines: (lines) ->
		# v1 imposes 30000 byte limit on length for extracting metadata
		return lines.join(" ").substr(0, 30000)

	detex: (string) ->
		return string
			.replace(/\\LaTeX/g, 'LaTeX')
			.replace(/\\TeX/g, 'TeX')
			.replace(/\\TikZ/g, 'TikZ')
			.replace(/\\BibTeX/g, 'BibTeX')
			.replace(/\\\[[A-Za-z0-9. ]*\]/g, ' ')
			.replace(/\\(?:[a-zA-Z]+|.|)/g, '')
			.replace(/{}|~/g, ' ')
			.replace(/[${}]/g, '')
			.replace(/ +/g, ' ')
			.trim()

	firstAuthorFromContent: (content) ->
		matches = content.match DocMetadata.extractAuthorRegExp
		return unless matches
		author = DocMetadata.detex matches[1]
		return author.replace(/\^[0-9]/g, ' ').replace(/ +/g, ' ').trim()

	injectIntoCaptureGroup: (content, regexp, inject) ->
		return "" unless typeof content == "string"
		matches = content.match regexp
		return content unless matches?
		# the first match element is the entire matching string and the
		# second is the captured sub-group. the index is the offset of
		# the entire match. replace the captured sub-group in the match
		# and concatenate with the content before and after the full match.
		return content.substring(0, matches.index) + matches[0].replace(matches[1], inject) + content.substring(matches.index+matches[0].length)

	injectMetadata: (lines, title, doc_abstract, keywords) ->
		return [] unless Array.isArray(lines)
		content = orig_content = lines.join("\n")
		content = DocMetadata.injectIntoCaptureGroup content, DocMetadata.injectAbstractRegExp, doc_abstract
		content = DocMetadata.injectIntoCaptureGroup content, DocMetadata.injectTitleRegExp, title
		if Array.isArray keywords
			if content.match DocMetadata.injectKeywordsRegExp
				content = DocMetadata.injectIntoCaptureGroup content, DocMetadata.injectKeywordsRegExp, keywords.join(", ")
			else if content.match DocMetadata.injectIEEEKeywordsRegExp
				content = DocMetadata.injectIntoCaptureGroup content, DocMetadata.injectIEEEKeywordsRegExp, keywords.join(", ")
		if content != orig_content
			return content.split("\n")

	keywordsFromContent: (content) ->
		matches = content.match DocMetadata.extractKeywordsRegExp
		matches = content.match DocMetadata.extractIEEEKeywordsRegExp unless matches
		return unless matches
		keyword = DocMetadata.detex matches[1]
		keywords = keyword.split(/[,;]/).map((keyword) ->
			return keyword.trim().replace(/\.$/, '')
		).filter((keyword) ->
			return keyword.length > 0
		)
		return unless keywords.length > 0
		return keywords
