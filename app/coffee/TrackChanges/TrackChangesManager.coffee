Project = require("../../../../../app/js/models/Project").Project

module.exports = TrackChangesManager =
	setTrackChangesState: (project_id, track_changes_state, callback = (error) ->) ->
		Project.update {_id: project_id}, {track_changes: track_changes_state}, callback
