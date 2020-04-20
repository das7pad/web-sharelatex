/* eslint-disable
    camelcase,
    handle-callback-err,
    max-len,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let TrackChangesController
const RangesManager = require('./RangesManager')
const logger = require('logger-sharelatex')
const UserInfoController = require('../../../../../app/src/Features/User/UserInfoController')
const DocumentUpdaterHandler = require('../../../../../app/src/Features/DocumentUpdater/DocumentUpdaterHandler')
const EditorRealTimeController = require('../../../../../app/src/Features/Editor/EditorRealTimeController')
const TrackChangesManager = require('./TrackChangesManager')

module.exports = TrackChangesController = {
  getAllRanges(req, res, next) {
    const { project_id } = req.params
    logger.log({ project_id }, 'request for project ranges')
    return RangesManager.getAllRanges(project_id, function (error, docs) {
      if (docs == null) {
        docs = []
      }
      if (error != null) {
        return next(error)
      }
      docs = Array.from(docs).map((d) => ({ id: d._id, ranges: d.ranges }))
      return res.json(docs)
    })
  },

  getAllChangesUsers(req, res, next) {
    const { project_id } = req.params
    logger.log({ project_id }, 'request for project range users')
    return RangesManager.getAllChangesUsers(project_id, function (
      error,
      users
    ) {
      if (error != null) {
        return next(error)
      }
      users = Array.from(users).map((user) =>
        UserInfoController.formatPersonalInfo(user)
      )
      // Get rid of any anonymous/deleted user objects
      users = users.filter((u) => (u != null ? u.id : undefined) != null)
      return res.json(users)
    })
  },

  acceptChanges(req, res, next) {
    const { project_id, doc_id } = req.params
    let { change_ids } = req.body
    if (change_ids == null) {
      change_ids = [req.params.change_id]
    }
    logger.log(
      { project_id, doc_id },
      `request to accept ${change_ids.length} changes`
    )
    return DocumentUpdaterHandler.acceptChanges(
      project_id,
      doc_id,
      change_ids,
      function (error) {
        if (error != null) {
          return next(error)
        }
        EditorRealTimeController.emitToRoom(
          project_id,
          'accept-changes',
          doc_id,
          change_ids,
          function (err) {}
        )
        return res.sendStatus(204)
      }
    )
  },

  setTrackChangesState(req, res, next) {
    const { project_id } = req.params
    logger.log({ project_id }, 'request to toggle track changes')
    return TrackChangesManager.getTrackChangesState(project_id, function (
      error,
      track_changes_state
    ) {
      if (error != null) {
        return next(error)
      }
      logger.log(
        { project_id, track_changes_state },
        'track changes current state'
      )

      if (req.body.on != null) {
        track_changes_state = !!req.body.on
      } else if (req.body.on_for != null) {
        if (typeof track_changes_state === 'boolean') {
          track_changes_state = {}
        }
        for (const key in req.body.on_for) {
          const value = req.body.on_for[key]
          if (
            key.match == null ||
            !key.match(/^[a-f0-9]{24}$/) ||
            typeof value !== 'boolean'
          ) {
            return res.sendStatus(400) // bad request
          } else {
            if (value) {
              track_changes_state[key] = value
            } else {
              delete track_changes_state[key]
            }
          }
        }
        if (req.body.on_for_guests === true) {
          track_changes_state.__guests__ = true
        } else {
          delete track_changes_state.__guests__
        }
      } else {
        return res.sendStatus(400) // bad request
      }

      if (
        typeof track_changes_state === 'object' &&
        Object.keys(track_changes_state).length === 0
      ) {
        track_changes_state = false
      }

      logger.log(
        { project_id, track_changes_state },
        'track changes updated state'
      )
      return TrackChangesManager.setTrackChangesState(
        project_id,
        track_changes_state,
        function (error) {
          if (error != null) {
            return next(error)
          }
          EditorRealTimeController.emitToRoom(
            project_id,
            'toggle-track-changes',
            track_changes_state,
            function (err) {}
          )
          return res.sendStatus(204)
        }
      )
    })
  }
}
