ThirdPartyReferencesAgent = require './ThirdPartyReferencesAgent'
logger = require 'logger-sharelatex'

class MendeleyAgent extends ThirdPartyReferencesAgent
	_sanitizeLinkedFileData: (linkedFileData) ->
		{ group_id, provider } = linkedFileData
		return { group_id, provider }

	_getContent: (user_id, linkedFileData, callback = (error, content) ->) ->
		url = @_buildUrl(user_id, linkedFileData)
		@_makeRequestToThirdPartyRefService(url, callback)

	_buildUrl: (user_id, linkedFileData) ->
		if linkedFileData.group_id?
			"/user/#{user_id}/mendeley/group/#{linkedFileData.group_id}/bibtex"
		else
			"/user/#{user_id}/mendeley/bibtex"

module.exports = new MendeleyAgent()
