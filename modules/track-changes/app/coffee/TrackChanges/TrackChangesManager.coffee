Project = require("../../../../../app/js/models/Project").Project
ProjectGetter = require '../../../../../app/js/Features/Project/ProjectGetter'

module.exports = TrackChangesManager =
	setTrackChangesState: (project_id, track_changes_state, callback = (error) ->) ->
		Project.update {_id: project_id}, {track_changes: track_changes_state}, callback

	getTrackChangesState: (project_id, callback = (error) ->) ->
		ProjectGetter.getProject project_id, track_changes: true, (error, project) ->
			return callback(error) if error?
			return callback null, project.track_changes || {}
