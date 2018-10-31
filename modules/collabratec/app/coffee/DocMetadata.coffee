module.exports = DocMetadata =

	abstractFromContent: (content) ->
		matches = content.match /\\begin\s*{abstract}(.+?)\\end\s*{abstract}/
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
		matches = content.match /\\[aA]uthor\s*{([^},]+)[,}]/
		return unless matches
		author = DocMetadata.detex matches[1]
		return author.replace(/\^[0-9]/g, ' ').replace(/ +/g, ' ').trim()

	keywordsFromContent: (content) ->
		matches = content.match /\\begin\s*{keywords}(.+?)\\end\s*{keywords}/
		matches = content.match /\\begin\s*{IEEEkeywords}(.+?)\\end\s*{IEEEkeywords}/ unless matches
		return unless matches
		keyword = DocMetadata.detex matches[1]
		keywords = keyword.split(/[,;]/).map((keyword) ->
			return keyword.trim().replace(/\.$/, '')
		).filter((keyword) ->
			return keyword.length > 0
		)
		return unless keywords.length > 0
		return keywords
