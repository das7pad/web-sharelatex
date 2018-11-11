ReferencesApiHandler = require '../ReferencesApiHandler'
ThirdPartyReferencesAgent = require './ThirdPartyReferencesAgent'
logger = require 'logger-sharelatex'
{
	RemoteServiceError
} = require '../../../../../app/js/Features/LinkedFiles/LinkedFilesErrors'

class MendeleyAgent extends ThirdPartyReferencesAgent
	_sanitizeLinkedFileData: (linkedFileData) ->
		{ group_id, provider } = linkedFileData
		return { group_id, provider }

	_getContent: (user_id, linkedFileData, callback = (error, content) ->) ->
		url = @_buildUrl(user_id, linkedFileData)
		opts =
			method:"get"
			url: url
		logger.log {user_id, linkedFileData}, "[ThirdPartyReferenceAgent] getting bibtex from third-party-references"
		ReferencesApiHandler.make3rdRequest opts, (err, response, body)->
			if err
				logger.err {user_id}, "[ThirdPartyReferenceAgent] error getting bibtex from third-party-references"
				return callback(err)
			if 200 <= response.statusCode < 300
				# Do import with bibtex content
				logger.log {user_id}, "[ThirdPartyReferenceAgent] got bibtex from third-party-references, importing"
				callback(null, body)
			else
				logger.log {user_id, linkedFileData, statusCode:response.statusCode},
					"[ThirdPartyReferenceAgent] error code from tpr api"
				return callback(new RemoteServiceError())

	_buildUrl: (user_id, linkedFileData) ->
		if linkedFileData.group_id?
			"/user/#{user_id}/mendeley/group/#{linkedFileData.group_id}/bibtex"
		else
			"/user/#{user_id}/mendeley/bibtex"

module.exports = new MendeleyAgent()
