let TrackChanges;
const TrackChangesRouter = require("./app/js/TrackChangesRouter");
const logger = require("logger-sharelatex");

const ProjectEditorHandler = require("../../app/js/Features/Project/ProjectEditorHandler");
ProjectEditorHandler.trackChangesAvailable = true;

module.exports = (TrackChanges =	
	{router: TrackChangesRouter});
