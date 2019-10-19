/* eslint-disable
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
let TrackChanges
const TrackChangesRouter = require('./app/js/TrackChangesRouter')
const logger = require('logger-sharelatex')

const ProjectEditorHandler = require('../../app/js/Features/Project/ProjectEditorHandler')
ProjectEditorHandler.trackChangesAvailable = true

module.exports = TrackChanges = { router: TrackChangesRouter }
