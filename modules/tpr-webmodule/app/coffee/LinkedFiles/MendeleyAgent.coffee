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
	RemoteServiceError,
	FileCannotRefreshError
} = require '../../../../../app/js/Features/LinkedFiles/LinkedFilesErrors'
ReferencesApiHandler = require '../ReferencesApiHandler'
logger = require 'logger-sharelatex'


module.exports = MendeleyAgent = {

	_buildUrl: (user_id, linkedFileData) ->
		if linkedFileData.group_id?
			"/user/#{user_id}/mendeley/group/#{linkedFileData.group_id}/bibtex"
		else
			"/user/#{user_id}/mendeley/bibtex"

	createLinkedFile: (project_id, linkedFileData, name, parent_folder_id, user_id, callback) ->
		callback = _.once(callback)
		{ group_id, provider } = linkedFileData
		linkedFileData = { group_id, provider, importer_id: user_id }
		url = MendeleyAgent._buildUrl(user_id, linkedFileData)
		MendeleyAgent._doImport(url, project_id, linkedFileData, name, parent_folder_id, user_id, callback)

	refreshLinkedFile: (project_id, linkedFileData, name, parent_folder_id, user_id, callback) ->
		callback = _.once(callback)
		url = MendeleyAgent._buildUrl(user_id, linkedFileData)
		if MendeleyAgent._isOrphanedImport(linkedFileData)
			return callback(new FileCannotRefreshError())
		MendeleyAgent._userIsImporter user_id, linkedFileData, (err, isImporter) ->
			return callback(err) if err?
			return callback(new NotOriginalImporterError()) if !isImporter
			MendeleyAgent._doImport(url, project_id, linkedFileData, name, parent_folder_id, user_id, callback)

	_doImport: (url, project_id, linkedFileData, name, parent_folder_id, user_id, callback) ->
		callback = _.once(callback)
		ReferencesApiHandler.userCanMakeRequest user_id, 'mendeley', (err, canMakeRequest) ->
			return callback(err) if err?
			return callback(new FeatureNotAvailableError()) if !canMakeRequest
			opts =
				method:"get"
				url: url
			logger.log {user_id, 'mendeley'}, "[MendeleyAgent] getting bibtex from third-party-references"
			ReferencesApiHandler.make3rdRequest opts, (err, response, body)->
				if err
					logger.err {user_id}, "[MendeleyAgent] error getting bibtex from third-party-references"
					return callback(err)
				if 200 <= response.statusCode < 300
					# Do import with bibtex content
					logger.log {user_id}, "[MendeleyAgent] got bibtex from third-party-references, importing"
					LinkedFilesHandler.importContent project_id,
						body,
						linkedFileData,
						name,
						parent_folder_id,
						user_id,
						(err, file) ->
							return callback(err) if err?
							callback(null, file._id) # Created
				else
					logger.log {user_id, project_id, statusCode:response.statusCode},
						"[MendeleyAgent] error code from tpr api"
					return callback(new RemoteServiceError())

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
}
