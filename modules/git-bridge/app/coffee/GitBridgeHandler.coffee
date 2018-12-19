Settings = require 'settings-sharelatex'
logger = require 'logger-sharelatex'
ProjectGetter = require '../../../../app/js/Features/Project/ProjectGetter'
UserGetter = require '../../../../app/js/Features/User/UserGetter'
ProjectEntityHandler = require '../../../../app/js/Features/Project/ProjectEntityHandler'
ProjectHistoryHandler = require '../../../../app/js/Features/Project/ProjectHistoryHandler'
EditorHttpController = require '../../../../app/js/Features/Editor/EditorHttpController'
SafePath = require '../../../../app/js/Features/Project/SafePath'
FileWriter = require '../../../../app/js/infrastructure/FileWriter'
UpdateMerger = require '../../../../app/js/Features/ThirdPartyDataStore/UpdateMerger'
Errors = require './GitBridgeErrors'
V1Api = require '../../../../app/js/Features/V1/V1Api'
request = require 'request'
url = require 'url'
_ = require 'lodash'
Async = require 'async'

module.exports = GitBridgeHandler =

	_checkAccess: (userId, projectId, callback=(err, project)->) ->
		ProjectGetter.getProjectWithoutDocLines projectId, (err, project) ->
			return callback(err) if err?
			_userCanAccess = (u) ->
				u?.features?.gitBridge
			UserGetter.getUser project.owner_ref, {features: 1}, (err, owner) ->
				return callback(err) if err?
				UserGetter.getUser userId, {features: 1, betaProgram: 1}, (err, user) ->
					return callback(err) if err?
					if !(_userCanAccess(owner) || _userCanAccess(user))
						return callback(new Errors.FeatureNotAvailable('Neither user nor project owner has gitBridge feature'))
					if !user.betaProgram
						return callback(new Errors.FeatureNotAvailable('User is not in beta program'))
					if project.overleaf?.history?.id?
						return callback(null, project)
					else
						ProjectHistoryHandler.ensureHistoryExistsForProject projectId, (err) ->
							return callback(err) if err?
							callback(null, project)

	getSavedVers: (userId, projectId, callback=(err, data)->) ->
		GitBridgeHandler._checkAccess userId, projectId, (err, project) ->
			return callback(err) if err?
			request.get {
				url: GitBridgeHandler._projectHistoryUrl("/project/#{projectId}/labels"),
				json: true
			}, (err, response, body) ->
				return callback(err) if err?
				if response.statusCode != 200
					err = new Error("Non-success status from project-history api: #{response.statusCode}")
					logger.err {err}, "Error while communicating with project-history api"
					return callback(err)
				if !_.isArray(body)
					err = new Error('response from project-history versions api is not an array')
					logger.err {projectId, err}, "[GitBridgeHandler] #{err.message}"
					return callback(err)
				Async.mapSeries body, GitBridgeHandler._formatLabelAsSavedVer, (err, savedVers) ->
					return callback(err) if err?
					importedAtVerId = project?.overleaf?.imported_at_ver_id
					if importedAtVerId?
						GitBridgeHandler._savedVersForImportedProject userId, project, savedVers, (err, savedVers) ->
							return callback(err) if err?
							callback(null, savedVers)
					else
						callback(null, savedVers)

	_savedVersForImportedProject: (userId, project, savedVers, callback) ->
		GitBridgeHandler._getMigratedFromId project, (err, v1DocId) ->
			return callback(err) if err?
			V1Api.request {
				url: "/api/v1/sharelatex/docs/#{v1DocId}/history_export/status",
				json: true
			}, (err, response, body) ->
				return callback(err) if err?
				if response.statusCode != 200
					err = new Error("Non-success status from v1 api: #{response.statusCode}")
					logger.err {err}, "Error while communicating with v1 export status api"
					return callback(err)
				exportedAtHistoryVersion = body.history_export_version
				filtered = savedVers.filter (sv) ->
					sv.versionId > exportedAtHistoryVersion
				callback(null, filtered)

	_formatLabelAsSavedVer: (label, callback=(err, savedVer)->) ->
		return callback(null, null) if !label?
		savedVer = {  # ported from `saved_vers_controller` in v1
			versionId: label.version
			comment:   label.comment
			createdAt: label.created_at
		}
		if label.user_id?
			UserGetter.getUser label.user_id, (err, user) ->
				return callback(err) if err?
				if user?
					savedVer.user = {
						name: "#{user.first_name} #{user.last_name}".trim(),
						email: user.email
					}
				callback(null, savedVer)
		else
			callback(null, savedVer)

	getLatestProjectVersion: (userId, projectId, callback=(err, data)->) ->
		GitBridgeHandler._checkAccess userId, projectId, (err, project) ->
			return callback(err) if err?
			request.get {
				url: GitBridgeHandler._projectHistoryUrl("/project/#{projectId}/version"),
				json: true
			}, (err, response, body) ->
				return callback(err) if err?
				if response.statusCode != 200
					err = new Error("Non-success status from project-history api: #{response.statusCode}")
					logger.err {err}, "Error while communicating with project-history api"
					return callback(err)
				if !body.version?
					err = new Error("No version received from project-history api")
					logger.err {err}, "Error while communicating with project-history api"
					return callback(err)
				authorId = (body.v2Authors or [])[0] or null
				GitBridgeHandler._getAuthorInfo authorId, (err, authorInfo) ->
					return callback(err) if err?
					data = {
						latestVerId: body.version
						latestVerAt: body.timestamp
						latestVerBy: authorInfo
					}
					GitBridgeHandler._getMigratedFromId project, (err, migratedFromId) ->
						return callback(err) if err?
						if migratedFromId?
							logger.log {projectId, userId, migratedFromId}, "Adding migratedFromId to response"
							data.migratedFromId = migratedFromId
						callback(null, data)

	_getMigratedFromId: (project, callback=(err, migratedFromId)->) ->
		if !project?.overleaf?.id?
			return callback(null, null)
		if !project.tokens?.readAndWrite? || !project.tokens?.readAndWrite?.startsWith("#{project.overleaf.id}")
			logger.err {projectId: project._id}, '[GitBridgeHandler] Inconsistent readAndWriteToken'
			return callback(new Error('Inconsistent readAndWrite token'))
		callback(null, project.tokens.readAndWrite)

	showSnapshot: (userId, projectId, version, callback=(err, data)->) ->
		GitBridgeHandler._checkAccess userId, projectId, (err, project) ->
			return callback(err) if err?
			request.get {
				url: GitBridgeHandler._projectHistoryUrl("/project/#{projectId}/version/#{version}"),
				json: true
			}, (err, response, body) ->
				return callback(err) if err?
				if response.statusCode != 200
					err = new Error("Non-success status from project-history api: #{response.statusCode}")
					logger.err {err}, "Error while communicating with project-history api"
					return callback(err)
				GitBridgeHandler._formatGitBridgeSnapshot body, (err, result) ->
					return callback(err) if err?
					callback(null, result)

	_formatGitBridgeSnapshot: (snapshotData, callback=(err, data)->) ->
		if !snapshotData?.files?
			err = new Error("Can't process snapshot-data, no files")
			logger.err {err, snapshotData}, "[GitBridgeHandler] #{err.message}"
			return callback(err)
		# Note: In v1, mutable documents were "srcs" (sources), and blob files were "atts" (attachments)
		# In v2, srcs are "docs" and atts are "files". The git-bridge service expects this format though,
		# so we're sticking to the old naming in this one case
		srcs = []
		atts = []
		for path, file of snapshotData.files
			if file.data.content?
				srcs.push [file.data.content, path]
			else if file.data.hash?
				atts.push [GitBridgeHandler._fileBlobUrl(file.data.hash), path]
			else
				err = new Error("Don't know how to process this file in snapshot")
				logger.err {err, path, file}, "[GitBridgeHandler] #{err.message}"
				return callback(err)
		callback(null, {srcs, atts})

	applySnapshotToProject: (userId, projectId, snapshot, callback=(err)->) ->
		GitBridgeHandler._checkAccess userId, projectId, (err) ->
			return callback(err) if err?
			ProjectGetter.getProject projectId, (err, project) ->
				return callback(err) if err?
				GitBridgeHandler.getLatestProjectVersion userId, projectId, (err, currentDocData) ->
					return callback(err) if err?
					{ latestVerId } = currentDocData
					snapshotVerId = snapshot.latestVerId
					{ postbackUrl } = snapshot
					if latestVerId > snapshot.latestVerId
						err = new Errors.OutOfDateError("project out of date: #{projectId}")
						logger.err {err, projectId, latestVerId, snapshotVerId},
							"[GitBridgeHandler] project out of date, can't apply snapshot"
					logger.log {userId, projectId}, "[GitBridgeHandler] starting snapshot application"
					callback()  # Do the actual import async, like the original rails implementation
					GitBridgeHandler._asyncApplySnapshot(userId, project, snapshot)

	_asyncApplySnapshot: (userId, project, snapshot, callback=()->) ->
		projectId = project._id
		Async.waterfall [
			(cb) ->
				GitBridgeHandler._prepareSnapshotFiles project, snapshot, cb
			(snapshotFiles, cb) ->
				GitBridgeHandler._prepareEntityOperations project, snapshotFiles, cb
			(operations, cb) ->
				GitBridgeHandler._fetchContentToDisk project, operations, cb
			(operationsWithContentPaths, cb) ->
				GitBridgeHandler._applyOperationsToProject userId, project, operationsWithContentPaths, cb
		], (err) ->
			if err?
				logger.err {err, projectId, latestVerId: snapshot.latestVerId},
					"[GitBridgeHandler] error while applying snapshot to project"
				GitBridgeHandler._handleApplySnapshotError project, snapshot, err, callback
			else
				logger.log {projectId, latestVerId: snapshot.latestVerId},
					"[GitBridgeHandler] applied snapshot to project, finishing up"
					GitBridgeHandler._finishSnapshotApplication userId, project, snapshot, () ->

	_handleApplySnapshotError: (project, snapshot, err, callback=(err)->) ->
		errorPayload = if err instanceof Errors.OutOfDateError
				{code: 'outOfDate', message: 'Out of Date'}
			else if err instanceof Errors.InvalidFileError
				{code: 'invalidFiles', message: 'Invalid Files', errors: err.errors}
			else
				{code: 'error', message: 'Unexpected Error'}
		logger.log {errorPayload, projectId: project._id},
			"[GitBridgeHandler] posting error back to git-bridge"
		GitBridgeHandler._postbackToGitBridge snapshot, errorPayload, callback

	_postbackToGitBridge: (snapshot, payload, callback) ->
		request.post snapshot.postbackUrl, {
			json: payload
		}, callback

	_prepareSnapshotFiles: (project, snapshot, callback=(err, files)->) ->
		files = []
		fileErrors = []
		for file in (snapshot.files or [])
			if !file.name?
				return callback(new Errors.InvalidFileError("file object has no name"))
			name = file.name
			if !EditorHttpController._nameIsAcceptableLength(name)
				logger.log {projectId: project._id, file}, '[GitBridgeHandler] invalid file length'
				fileErrors.push({
					file: file.name,
					state: 'error'
				})
				continue
			if !SafePath.isCleanPath(name)
				logger.log {projectId: project._id, file}, '[GitBridgeHandler] invalid file name'
				fileErrors.push({
					file: file.name,
					state: 'error'
				})
				continue
			newFile = {name: name}
			if file.url?
				newFile.url = url.parse(file.url).format()
			files.push(newFile)
		if fileErrors.length > 0
			err = new Errors.InvalidFileError()
			err.errors = fileErrors
			logger.err {err, errors: err.errors, projectId: project._id}, "[GitBridgeHandler] invalid files"
			return callback(err)
		else
			callback(null, files)

	_prepareEntityOperations: (project, snapshotFiles, callback=(err, operations)->) ->
		deleteEntities = []
		changeEntities = []
		ProjectEntityHandler.getAllEntitiesFromProject project, (err, docs, files) ->
			return callback(err) if err?
			snapshotPaths = new Set(snapshotFiles.map (sf) => "/#{sf.name}")
			for entity in docs.concat(files)
				if !snapshotPaths.has(entity.path)
					deleteEntities.push {path: entity.path}
			for file in snapshotFiles
				if file.url?
					changeEntities.push {
						path: "/#{file.name}",
						url: file.url
					}
			callback(null, {deleteEntities, changeEntities})

	_fetchContentToDisk: (project, operations, callback=(err, modifiedOperations)->) ->
		identifier = "#{project._id}_git-bridge"
		fetchFn = (entity, cb) ->
			if !entity.url?
				return cb(null, entity)
			readStream = request.get(entity.url)
			FileWriter.writeStreamToDisk identifier, readStream, (err, fsPath) ->
				return cb(err) if err?
				entity.contentFsPath = fsPath
				cb(null, entity)
		logger.log {projectId: project._id}, "[GitBridgeHandler] fetching content for changes"
		Async.mapLimit operations.changeEntities, 5, fetchFn, (err, changeEntitiesWithContentPaths) ->
			return callback(err) if err?
			operations.changeEntities = changeEntitiesWithContentPaths
			callback(null, operations)

	_applyOperationsToProject: (userId, project, operations, callback=(err)->) ->
		{ deleteEntities, changeEntities } = operations
		projectId = project._id
		source = 'git-bridge'
		logger.log {userId, projectId: project._id, deleteCount: deleteEntities.length},
			"[GitBridgeHandler] applying delete operations to project"
		Async.each deleteEntities,
			(entity, cb) ->
				UpdateMerger.deleteUpdate userId, projectId, entity.path, source, cb
			, (err) ->
				return callback(err) if err?
				logger.log {userId, projectId: project._id, changeCount: changeEntities.length},
					"[GitBridgeHandler] applying change operations to project"
				Async.each changeEntities,
					(entity, cb) ->
						UpdateMerger._mergeUpdate userId, projectId, entity.path, entity.contentFsPath, source, cb
					, (err) ->
						return callback(err) if err?
						callback()

	_finishSnapshotApplication: (userId, project, snapshot, callback=(err)->) ->
		GitBridgeHandler.getLatestProjectVersion userId, project._id, (err, currentDocData) ->
			return callback(err) if err?
			{ latestVerId } = currentDocData
			logger.log {userId, projectId: project._id, latestVerId},
				"[GitBrigeHandler] postback to git-bridge"
			GitBridgeHandler._postbackToGitBridge snapshot, {
				code: 'upToDate', latestVerId: latestVerId
			}, (err, response) ->
				return callback(err) if err?
				statusCode = response.statusCode
				logger.log {projectId: project._id, statusCode},
					"[GitBrigeHandler] response from postback"
				callback()

	_fileBlobUrl: (hash) ->
		"#{Settings.apis.v1_history.url}/blobs/#{hash}/content"

	_projectHistoryUrl: (path) ->
		"#{Settings.apis.project_history.url}#{path}"

	_getAuthorInfo: (userId, callback=(err, info)->) ->
		if !userId?
			return callback(null, null)
		UserGetter.getUser userId, {first_name: 1, last_name: 1, email: 1}, (err, user) ->
			return callback(err) if err?
			if !user?
				return callback(null, null)
			callback(null, {email: user.email, name: "#{user.first_name} #{user.last_name}"})

