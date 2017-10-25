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

	setTrackChangesState: (req, res, next) ->
		{project_id} = req.params
		logger.log {project_id }, "request to toggle track changes"
		TrackChangesManager.getTrackChangesState project_id, (error, track_changes_state) ->
			return next(error) if error?
			logger.log {project_id, track_changes_state}, "track changes current state"

			if req.body.on?
				track_changes_state = !!req.body.on
			else if req.body.on_for?
				if typeof track_changes_state is "boolean"
					track_changes_state = {}
				for key, value of req.body.on_for
					if !key.match? or !key.match(/^[a-f0-9]{24}$/) or typeof value != "boolean"
						return res.send 400 # bad request
					else
						if value
							track_changes_state[key] = value
						else
							delete track_changes_state[key]
				if req.body.on_for_guests == true
					track_changes_state['__guests__'] = true
				else
					delete track_changes_state['__guests__']
			else
				return res.send 400 # bad request

			if (
				typeof track_changes_state == 'object' &&
				Object.keys(track_changes_state).length == 0
			)
				track_changes_state = false

			logger.log {project_id, track_changes_state}, "track changes updated state"
			TrackChangesManager.setTrackChangesState project_id, track_changes_state, (error) ->
				return next(error) if error?
				EditorRealTimeController.emitToRoom project_id, "toggle-track-changes", track_changes_state, (err)->
				res.send 204
