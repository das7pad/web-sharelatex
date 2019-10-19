/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let TrackChangesManager;
const {
    Project
} = require("../../../../../app/js/models/Project");
const ProjectGetter = require('../../../../../app/js/Features/Project/ProjectGetter');

module.exports = (TrackChangesManager = {
	setTrackChangesState(project_id, track_changes_state, callback) {
		if (callback == null) { callback = function(error) {}; }
		return Project.update({_id: project_id}, {track_changes: track_changes_state}, callback);
	},

	getTrackChangesState(project_id, callback) {
		if (callback == null) { callback = function(error) {}; }
		return ProjectGetter.getProject(project_id, {track_changes: true}, function(error, project) {
			if (error != null) { return callback(error); }
			return callback(null, project.track_changes || {});
	});
	}
});
