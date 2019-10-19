TrackChangesRouter = require "./app/js/TrackChangesRouter"
logger = require "logger-sharelatex"

ProjectEditorHandler = require "../../app/js/Features/Project/ProjectEditorHandler"
ProjectEditorHandler.trackChangesAvailable = true

module.exports = TrackChanges =	
	router: TrackChangesRouter
