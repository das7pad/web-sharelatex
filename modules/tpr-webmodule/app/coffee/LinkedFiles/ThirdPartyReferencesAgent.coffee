request = require 'request'
_ = require "underscore"
urlValidator = require 'valid-url'
Settings = require 'settings-sharelatex'
UserGetter = require '../../../../../app/js/Features/User/UserGetter'
LinkedFilesHandler = require '../../../../../app/js/Features/LinkedFiles/LinkedFilesHandler'
{
	InvalidUrlError,
	UrlFetchFailedError,
	AccessDeniedError,
	BadDataError,
	NotOriginalImporterError,
	FeatureNotAvailableError,
	FileCannotRefreshError,
	RemoteServiceError
} = require '../../../../../app/js/Features/LinkedFiles/LinkedFilesErrors'
ReferencesApiHandler = require '../ReferencesApiHandler'
logger = require 'logger-sharelatex'

module.exports = class ThirdPartyReferencesAgent
	_sanitizeLinkedFileData = (linkedFileData) ->
		throw new Error('Please implement _santizeLinkedFileData in sub-class')

	_getContent: (user_id, linkedFileData, callback = (error, content) ->) ->
		throw new Error('Please implement _getContent in sub-class')

	createLinkedFile: (project_id, linkedFileData, name, parent_folder_id, user_id, callback) ->
		callback = _.once(callback)
		linkedFileData = @_sanitizeLinkedFileData(linkedFileData)
		linkedFileData.importer_id = user_id
		@_doImport(project_id, linkedFileData, name, parent_folder_id, user_id, callback)

	refreshLinkedFile: (project_id, linkedFileData, name, parent_folder_id, user_id, callback) ->
		callback = _.once(callback)
		if @_isOrphanedImport(linkedFileData)
			return callback(new FileCannotRefreshError())
		@_userIsImporter user_id, linkedFileData, (err, isImporter) =>
			return callback(err) if err?
			return callback(new NotOriginalImporterError()) if !isImporter
			@_doImport(project_id, linkedFileData, name, parent_folder_id, user_id, callback)

	_doImport: (project_id, linkedFileData, name, parent_folder_id, user_id, callback) ->
		callback = _.once(callback)
		ReferencesApiHandler.userCanMakeRequest user_id, 'mendeley', (err, canMakeRequest) =>
			return callback(err) if err?
			return callback(new FeatureNotAvailableError()) if !canMakeRequest
			@_getContent user_id, linkedFileData, (err, content) ->
				return callback(err) if err?
				LinkedFilesHandler.importContent project_id,
					content,
					linkedFileData,
					name,
					parent_folder_id,
					user_id,
					(err, file) ->
						return callback(err) if err?
						callback(null, file._id) # Created

	_isOrphanedImport: (data) ->
		!data.v1_importer_id? && !data.importer_id?

	_userIsImporter: (current_user_id, linkedFileData, callback=(err, isImporter)->) ->
		callback = _.once(callback)
		if linkedFileData.v1_importer_id?
			UserGetter.getUser current_user_id, {_id: 1, overleaf: 1}, (err, user) ->
				return callback(err) if err?
				callback(null, user? && user.overleaf? && (user.overleaf.id == linkedFileData.v1_importer_id))
		else
			callback(null, current_user_id.toString() == linkedFileData.importer_id.toString())

	_makeRequestToThirdPartyRefService: (url, callback = (error, body) ->) ->
		logger.log {url}, "[ThirdPartyReferenceAgent] getting bibtex from third-party-references"
		ReferencesApiHandler.make3rdRequest { method: 'GET', url }, (err, response, body)->
			if err
				logger.err {url}, "[ThirdPartyReferenceAgent] error getting bibtex from third-party-references"
				return callback(err)
			if 200 <= response.statusCode < 300
				# Do import with bibtex content
				logger.log {url}, "[ThirdPartyReferenceAgent] got bibtex from third-party-references, importing"
				callback(null, body)
			else
				logger.log {url, statusCode:response.statusCode},
					"[ThirdPartyReferenceAgent] error code from tpr api"
				return callback(new RemoteServiceError())