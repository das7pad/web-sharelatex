Settings = require 'settings-sharelatex'
logger = require 'logger-sharelatex'
GitBridgeHandler = require './GitBridgeHandler'
GitBridgeErrors = require './GitBridgeErrors'


# TODO: replace this with real OAuth user per request
TEST_USER_ID = '5bc8680afc8b910129394d9b'


module.exports = GitBridgeController =

	showDoc: (req, res, next) ->
		projectId = req.params['project_id']
		logger.log {projectId}, "[GitBridgeController] getting doc/project"
		GitBridgeHandler.showDoc TEST_USER_ID, projectId, (err, data) ->
			return GitBridgeController._handleError(err, req, res, next) if err?
			res.json(data)

	showSavedVers: (req, res, next) ->
		# No saved vers, for now
		return res.json([])

	showSnapshot: (req, res, next) ->
		projectId = req.params['project_id']
		version = req.params['version']
		logger.log {projectId, version}, "[GitBridgeController] getting snapshot"
		GitBridgeHandler.showSnapshot TEST_USER_ID, projectId, version, (err, data) ->
			return GitBridgeController._handleError(err, req, res, next) if err?
			res.json(data)

	applySnapshot: (req, res, next) ->
		projectId = req.params['project_id']
		snapshot = req.body
		if !snapshot.latestVerId? or !snapshot.files?
			logger.err {projectId}, "[GitBridgeController] Invalid snapshot"
			return res.status(400).send('Invalid snapshot')
		logger.log {projectId, latestVerId: snapshot.latestVerId, fileCount: snapshot.files.length},
			"[GitBridgeController] Applying snapshot to project"
		GitBridgeHandler.applySnapshotToProject TEST_USER_ID, projectId, snapshot, (err) ->
			return GitBridgeController._handleError(err, req, res, next) if err?
			res.status(202).json {code: 'accepted', message: 'Accepted'}

	_handleError: (err, req, res, next) ->
		if err instanceof GitBridgeErrors.OutOfDateError
			return res.status(409).json {code: 'outOfDate', message: 'Out of Date'}
		if err instanceof GitBridgeErrors.ProjectNotCompatibleError
			return res.status(501).send err.message
		next(err)
