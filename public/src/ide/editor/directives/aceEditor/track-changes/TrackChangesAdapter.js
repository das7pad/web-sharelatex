/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define(['ace/ace', 'ide/editor/AceShareJsCodec'], function(
  Ace,
  AceShareJsCodec
) {
  let TrackChangesAdapter
  return (TrackChangesAdapter = (function() {
    let Range
    TrackChangesAdapter = class TrackChangesAdapter {
      static initClass() {
        ;({ Range } = ace.require('ace/range'))
      }

      constructor(editor) {
        this.editor = editor
        this.changeIdToMarkerIdMap = {}

        this._aceRangeToShareJs = this._aceRangeToShareJs.bind(this)
      }

      updateFocus() {
        const selection = this.editor.getSelectionRange()

        const selection_start = this._aceRangeToShareJs(selection.start)
        const selection_end = this._aceRangeToShareJs(selection.end)
        const is_selection = selection_start !== selection_end

        return {
          start: selection_start,
          end: selection_end,
          isSelection: is_selection
        }
      }

      _aceRangeToShareJs(range) {
        const lines = this.editor
          .getSession()
          .getDocument()
          .getLines(0, range.row)
        return AceShareJsCodec.aceRangeToShareJs(range, lines)
      }

      onInsertAdded(change) {
        const start = this.shareJsOffsetToAcePosition(change.op.p)
        const end = this.shareJsOffsetToAcePosition(
          change.op.p + change.op.i.length
        )
        const session = this.editor.getSession()
        const doc = session.getDocument()
        const background_range = new Range(
          start.row,
          start.column,
          end.row,
          end.column
        )
        const background_marker_id = session.addMarker(
          background_range,
          'track-changes-marker track-changes-added-marker',
          'text'
        )
        const callout_marker_id = this.createCalloutMarker(
          start,
          'track-changes-added-marker-callout'
        )

        this.changeIdToMarkerIdMap[change.id] = {
          background_marker_id,
          callout_marker_id
        }
      }

      onDeleteAdded(change) {
        const position = this.shareJsOffsetToAcePosition(change.op.p)
        const session = this.editor.getSession()
        const doc = session.getDocument()

        const markerLayer = this.editor.renderer.$markerBack
        const klass = 'track-changes-marker track-changes-deleted-marker'
        const background_range = this.makeZeroWidthRange(position)
        const background_marker_id = session.addMarker(
          background_range,
          klass,
          (html, range, left, top, config) =>
            markerLayer.drawSingleLineMarker(
              html,
              range,
              `${klass} ace_start`,
              config,
              0,
              ''
            )
        )

        const callout_marker_id = this.createCalloutMarker(
          position,
          'track-changes-deleted-marker-callout'
        )

        return (this.changeIdToMarkerIdMap[change.id] = {
          background_marker_id,
          callout_marker_id
        })
      }

      onInsertRemoved(change) {
        const {
          background_marker_id,
          callout_marker_id
        } = this.changeIdToMarkerIdMap[change.id]
        delete this.changeIdToMarkerIdMap[change.id]
        const session = this.editor.getSession()
        session.removeMarker(background_marker_id)
        session.removeMarker(callout_marker_id)
      }

      onDeleteRemoved(change) {
        const {
          background_marker_id,
          callout_marker_id
        } = this.adapter.changeIdToMarkerIdMap[change.id]
        delete this.adapter.changeIdToMarkerIdMap[change.id]
        const session = this.editor.getSession()
        session.removeMarker(background_marker_id)
        return session.removeMarker(callout_marker_id)
      }

      onChangeMoved(change) {
        console.log('When does this get called', change)
        let end
        const start = this.shareJsOffsetToAcePosition(change.op.p)
        if (change.op.i != null) {
          end = this.shareJsOffsetToAcePosition(
            change.op.p + change.op.i.length
          )
        } else {
          end = start
        }
        return this.updateMarker(change.id, start, end)
      }

      updateMarker(change_id, start, end) {
        if (this.changeIdToMarkerIdMap[change_id] == null) {
          return
        }
        const session = this.editor.getSession()
        const markers = session.getMarkers()
        const {
          background_marker_id,
          callout_marker_id
        } = this.changeIdToMarkerIdMap[change_id]
        if (
          background_marker_id != null &&
          markers[background_marker_id] != null
        ) {
          const background_marker = markers[background_marker_id]
          background_marker.range.start = start
          background_marker.range.end = end
        }
        if (callout_marker_id != null && markers[callout_marker_id] != null) {
          const callout_marker = markers[callout_marker_id]
          callout_marker.range.start = start
          return (callout_marker.range.end = start)
        }
      }

      shareJsOffsetToAcePosition(offset) {
        const lines = this.editor
          .getSession()
          .getDocument()
          .getAllLines()
        return AceShareJsCodec.shareJsOffsetToAcePosition(offset, lines)
      }

      createCalloutMarker(position, klass) {
        let callout_marker_id
        const session = this.editor.getSession()
        const callout_range = this.makeZeroWidthRange(position)
        const markerLayer = this.editor.renderer.$markerBack
        return (callout_marker_id = session.addMarker(
          callout_range,
          klass,
          (html, range, left, top, config) =>
            markerLayer.drawSingleLineMarker(
              html,
              range,
              `track-changes-marker-callout ${klass} ace_start`,
              config,
              0,
              'width: auto; right: 0;'
            )
        ))
      }

      makeZeroWidthRange(position) {
        const ace_range = new Range(
          position.row,
          position.column,
          position.row,
          position.column
        )
        // Our delete marker is zero characters wide, but Ace doesn't draw ranges
        // that are empty. So we monkey patch the range to tell Ace it's not empty.
        // We do want to claim to be empty if we're off screen after clipping rows though.
        // This is the code we need to trick:
        //   var range = marker.range.clipRows(config.firstRow, config.lastRow);
        //   if (range.isEmpty()) continue;
        ace_range.clipRows = function(first_row, last_row) {
          this.isEmpty = function() {
            return first_row > this.end.row || last_row < this.start.row
          }
          return this
        }
        return ace_range
      }
    }
    TrackChangesAdapter.initClass()
    return TrackChangesAdapter
  })())
})
