ThirdPartyReferencesAgent = require './ThirdPartyReferencesAgent'
logger = require 'logger-sharelatex'

PER_PAGE_LIMIT = 100
MAX_ITERATIONS = 100

class ZoteroAgent extends ThirdPartyReferencesAgent
	_sanitizeLinkedFileData: (linkedFileData) ->
		{ format, provider } = linkedFileData
		format = @_getFormat(format)
		return { format, provider }

	_getContent: (user_id, linkedFileData, callback = (error, content) ->) ->
		start = 0
		content = ""
		iteration = 0
		do fetchTillBlank = () =>
			iteration++
			if (iteration > MAX_ITERATIONS)
				return callback(new Error('too many iterations for zotero pages'))
			@_getContentPage user_id, linkedFileData, start, (err, pageContent) ->
				return callback(err) if err?
				if !pageContent? or pageContent.length == 0
					return callback(null, content)
				else
					content += pageContent
					start += PER_PAGE_LIMIT
					fetchTillBlank()

	_getContentPage: (user_id, linkedFileData, start, callback = (error, content) ->) ->
		url = @_buildUrl(user_id, linkedFileData, start)
		@_makeRequestToThirdPartyRefService(url, callback)

	_buildUrl: (user_id, linkedFileData, start) ->
		{format} = linkedFileData
		format = @_getFormat(format)
		"/user/#{user_id}/zotero/bibtex?format=#{format}&limit=#{PER_PAGE_LIMIT}&start=#{start}"

	_getFormat: (format) ->
		unless format in ['bibtex', 'biblatex']
			return 'bibtex'
		else
			return format

module.exports = new ZoteroAgent()
