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
		
		if req.body.on?
			track_changes_state = !!req.body.on
		else if req.body.on_for?
			for key, value in req.body.on_for
				if !key.match(/[a-f0-9]{24}/) or typeof value is not "boolean"
					return res.send 400 # bad request
			track_changes_state = req.body.on_for
		else
			return res.send 400 # bad reqeust
			
		logger.log {project_id, track_changes_state}, "request to toggle track changes"
		TrackChangesManager.setTrackChangesState project_id, track_changes_state, (error) ->
			return next(error) if error?
			EditorRealTimeController.emitToRoom project_id, "toggle-track-changes", track_changes_state, (err)->
			res.send 204
