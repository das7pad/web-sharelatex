/* eslint-disable
    camelcase
 */
define([
  '../../../../../../../frontend/js/ide/editor/EditorShareJsCodec'
], function (EditorShareJsCodec) {
  class TrackChangesAdapter {
    constructor(editor) {
      this.findTrackChangesMarker = this.findTrackChangesMarker.bind(this)
      this.getTrackChangesMarkers = this.getTrackChangesMarkers.bind(this)
      this.onInsertAdded = this.onInsertAdded.bind(this)
      this.shareJsOffsetToRowColumn = this.shareJsOffsetToRowColumn.bind(this)
      this.onDeleteAdded = this.onDeleteAdded.bind(this)
      this.onChangeMoved = this.onChangeMoved.bind(this)
      this.editor = editor
      this.cm = this.editor.getCodeMirror()
    }

    getTrackChangesMarkers() {
      return this.cm.doc.getAllMarks().filter((marker) => {
        const isInsertOrCommentMarker =
          marker.className &&
          marker.className.indexOf('track-changes-marker') !== -1
        const isDeleteMarker =
          marker.type === 'bookmark' &&
          marker.replacedWith &&
          marker.replacedWith.className.indexOf('track-changes-marker') !== -1

        return isInsertOrCommentMarker || isDeleteMarker
      })
    }

    findTrackChangesMarker(markerId) {
      return this.getTrackChangesMarkers().find(
        (marker) => marker.id === markerId
      )
    }

    clearAnnotations() {
      this.getTrackChangesMarkers().forEach((marker) => marker.clear())

      this.changeIdToMarkerIdMap = {}
    }

    tearDown() {
      this.changeIdToMarkerIdMap = {}
    }

    onInsertAdded(change) {
      const start = this.shareJsOffsetToRowColumn(change.op.p)
      const end = this.shareJsOffsetToRowColumn(
        change.op.p + change.op.i.length
      )
      const marker = this.cm.doc.markText(
        { line: start.row, ch: start.column },
        { line: end.row, ch: end.column },
        { className: 'track-changes-marker track-changes-added-marker' }
      )
      this.changeIdToMarkerIdMap[change.id] = marker.id
    }

    onDeleteAdded(change) {
      const position = this.shareJsOffsetToRowColumn(change.op.p)

      const el = document.createElement('span')
      el.className = 'track-changes-marker track-changes-deleted-marker'

      const marker = this.cm.setBookmark(
        { line: position.row, ch: position.column },
        {
          widget: el,
          insertLeft: true
        }
      )

      this.changeIdToMarkerIdMap[change.id] = marker.id
    }

    onInsertRemoved(change) {
      const markerId = this.changeIdToMarkerIdMap[change.id]
      delete this.changeIdToMarkerIdMap[change.id]

      const marker = this.findTrackChangesMarker(markerId)
      if (!marker) return

      marker.clear()
    }

    onDeleteRemoved(change) {
      const markerId = this.changeIdToMarkerIdMap[change.id]
      delete this.changeIdToMarkerIdMap[change.id]

      const marker = this.findTrackChangesMarker(markerId)
      if (!marker) return

      marker.clear()
    }

    onChangeMoved(change) {
      let end
      const start = this.shareJsOffsetToRowColumn(change.op.p)
      if (change.op.i != null) {
        end = this.shareJsOffsetToRowColumn(change.op.p + change.op.i.length)
      } else {
        end = start
      }
      this.updateMarker(change, start, end)
    }

    onCommentAdded(comment) {
      const start = this.shareJsOffsetToRowColumn(comment.op.p)
      const end = this.shareJsOffsetToRowColumn(
        comment.op.p + comment.op.c.length
      )
      const marker = this.cm.doc.markText(
        { line: start.row, ch: start.column },
        { line: end.row, ch: end.column },
        { className: 'track-changes-marker track-changes-comment-marker' }
      )
      this.changeIdToMarkerIdMap[comment.id] = marker.id
    }

    onCommentMoved(comment) {
      const start = this.shareJsOffsetToRowColumn(comment.op.p)
      const end = this.shareJsOffsetToRowColumn(
        comment.op.p + comment.op.c.length
      )
      this.updateMarker(comment, start, end)
    }

    onCommentRemoved(comment) {
      // Resolved comments may not have marker ids
      if (!this.changeIdToMarkerIdMap[comment.id]) return

      const markerId = this.changeIdToMarkerIdMap[comment.id]
      delete this.changeIdToMarkerIdMap[comment.id]

      const marker = this.findTrackChangesMarker(markerId)
      if (!marker) return

      marker.clear()
    }

    updateMarker(change, start, end) {
      const markerId = this.changeIdToMarkerIdMap[change.id]

      if (change.op.i || change.op.c) {
        const marker = this.findTrackChangesMarker(markerId)
        if (!marker) return

        marker.clear()

        const type = change.op.i ? 'added' : 'comment'
        const updatedMarker = this.cm.doc.markText(
          { line: start.row, ch: start.column },
          { line: end.row, ch: end.column },
          { className: `track-changes-marker track-changes-${type}-marker` }
        )

        this.changeIdToMarkerIdMap[change.id] = updatedMarker.id
      }
    }

    // Commented out while not implementing callouts on delete markers
    // (which caused the overlapping)

    // clearOverlappingDeleteMarkers(markerNode) {
    //   const markers = Object.values(this.changeIdToMarkerIdMap).filter(
    //     marker => typeof marker === 'object'
    //   )

    //   const markerNodes = markers.map(marker => marker.marker)

    //   // Find overlapping markers (markers on the same line)
    //   const markerTopValue = markerNode.style.top
    //   const markersMatchingTop = markerNodes.filter(
    //     marker => marker.style.top === markerTopValue
    //   )

    //   // Find the marker on the most left of that line
    //   // (Which we don't want to affect)
    //   const markersMatchingTopLefts = markersMatchingTop.map(marker =>
    //     parseInt(marker.style.left)
    //   )
    //   const mostLeftMarkerValue = Math.min(...markersMatchingTopLefts)

    //   // Reduce the width of all non-far-left markers on that line
    //   for (let marker of markersMatchingTop) {
    //     if (parseInt(marker.style.left) > mostLeftMarkerValue) {
    //       marker.style.width = 0
    //     }
    //   }
    // }

    shareJsOffsetToRowColumn(offset) {
      const lines = this.cm.doc.getValue().split('\n')
      return EditorShareJsCodec.shareJsOffsetToRowColumn(offset, lines)
    }
  }
  return TrackChangesAdapter
})
