RangesManager = require "./RangesManager"
logger = require "logger-sharelatex"
UserInfoController = require "../../../../../app/js/Features/User/UserInfoController"
DocumentUpdaterHandler = require "../../../../../app/js/Features/DocumentUpdater/DocumentUpdaterHandler"
EditorRealTimeController = require("../../../../../app/js/Features/Editor/EditorRealTimeController")
TrackChangesManager = require "./TrackChangesManager"

module.exports = TrackChangesController =
	getAllRanges: (req, res, next) ->
		project_id = req.params.project_id
		logger.log {project_id}, "request for project ranges"
		RangesManager.getAllRanges project_id, (error, docs = []) ->
			return next(error) if error?
			docs = ({id: d._id, ranges: d.ranges} for d in docs)
			res.json docs
	
	getAllChangesUsers: (req, res, next) ->
		project_id = req.params.project_id
		logger.log {project_id}, "request for project range users"
		RangesManager.getAllChangesUsers project_id, (error, users) ->
			return next(error) if error?
			users = (UserInfoController.formatPersonalInfo(user) for user in users)
			# Get rid of any anonymous/deleted user objects
			users = users.filter (u) -> u?.id?
			res.json users

	acceptChanges: (req, res, next) ->
		{project_id, doc_id } = req.params
		{change_ids} = req.body
		if !change_ids?
			change_ids = [ req.params.change_id ]
		logger.log {project_id, doc_id }, "request to accept #{ change_ids.length } changes"
		DocumentUpdaterHandler.acceptChanges project_id, doc_id, change_ids, (error) ->
			return next(error) if error?
			EditorRealTimeController.emitToRoom project_id, "accept-changes", doc_id, change_ids, (err)->
			res.send 204

	toggleTrackChanges: (req, res, next) ->
		{project_id} = req.params
		track_changes_on = !!req.body.on
		logger.log {project_id, track_changes_on}, "request to toggle track changes"
		TrackChangesManager.toggleTrackChanges project_id, track_changes_on, (error) ->
			return next(error) if error?
			EditorRealTimeController.emitToRoom project_id, "toggle-track-changes", track_changes_on, (err)->
			res.send 204
