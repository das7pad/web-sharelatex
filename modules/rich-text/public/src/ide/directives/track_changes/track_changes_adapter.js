/* eslint-disable
    camelcase
 */
define(['ide/editor/EditorShareJsCodec'], function(EditorShareJsCodec) {
  class TrackChangesAdapter {
    constructor(editor) {
      this.onInsertAdded = this.onInsertAdded.bind(this)
      this.shareJsOffsetToRowColumn = this.shareJsOffsetToRowColumn.bind(this)
      this.onDeleteAdded = this.onDeleteAdded.bind(this)
      this.onChangeMoved = this.onChangeMoved.bind(this)
      this.editor = editor
      this.cm = this.editor.getCodeMirror()
    }

    clearAnnotations() {
      const markers = this.cm.doc.getAllMarks()

      for (let marker of markers) {
        marker.clear()
      }
      this.changeIdToMarkerIdMap = {}
    }

    onInsertAdded(change) {
      let start, end, marker
      start = this.shareJsOffsetToRowColumn(change.op.p)
      end = this.shareJsOffsetToRowColumn(change.op.p + change.op.i.length)
      marker = this.cm.doc.markText(
        { line: start.row, ch: start.column },
        { line: end.row, ch: end.column },
        { className: 'track-changes-marker track-changes-added-marker' }
      )
      this.changeIdToMarkerIdMap[change.id] = marker.id
    }

    onDeleteAdded(change) {
      let position, markerNode
      position = this.shareJsOffsetToRowColumn(change.op.p)

      markerNode = document.createElement('div')
      markerNode.className = 'track-changes-deleted-marker-callout'

      this.cm.addWidget(
        { line: position.row, ch: position.column },
        markerNode,
        false
      )
      this.changeIdToMarkerIdMap[change.id] = markerNode

      this.clearOverlappingDeleteMarkers(markerNode)
    }

    onChangeMoved(change) {
      let end
      const start = this.shareJsOffsetToRowColumn(change.op.p)
      if (change.op.i != null) {
        end = this.shareJsOffsetToRowColumn(change.op.p + change.op.i.length)
      } else {
        end = start
      }
      this.updateMarker(change.id, start, end)
    }

    updateMarker(change_id, start, end) {
      // If it's not a delete
      if (typeof this.changeIdToMarkerIdMap[change_id] === 'number') {
        const markers = this.cm.doc.getAllMarks()
        const markerId = this.changeIdToMarkerIdMap[change_id]
        for (let marker of markers) {
          if (marker.id === markerId) {
            marker.clear()
            let updatedMarker = this.cm.doc.markText(
              { line: start.row, ch: start.column },
              { line: end.row, ch: end.column },
              { className: 'track-changes-marker track-changes-added-marker' }
            )

            this.changeIdToMarkerIdMap[change_id] = updatedMarker.id
          }
        }
      } else if (typeof this.changeIdToMarkerIdMap[change_id] === 'object') {
        const markerNode = this.changeIdToMarkerIdMap[change_id]

        this.cm.addWidget(
          { line: start.row, ch: start.column },
          markerNode,
          false
        )

        this.clearOverlappingDeleteMarkers(markerNode)
      }
    }

    clearOverlappingDeleteMarkers(markerNode) {
      const markers = Object.values(this.changeIdToMarkerIdMap).filter(
        marker => typeof marker === 'object'
      )

      // Find overlapping markers (markers on the same line)
      const markerTopValue = markerNode.style.top
      const markersMatchingTop = markers.filter(
        marker => marker.style.top === markerTopValue
      )

      // Find the marker on the most left of that line, which we don't want to affect
      const markersMatchingTopLefts = markersMatchingTop.map(marker =>
        parseInt(marker.style.left)
      )
      const mostLeftMarkerValue = Math.min(...markersMatchingTopLefts)

      // Reduce the width of all non-far-left markers on that line
      for (let marker of markersMatchingTop) {
        if (parseInt(marker.style.left) > mostLeftMarkerValue) {
          marker.style.width = 0
        }
      }
    }

    shareJsOffsetToRowColumn(offset) {
      const lines = this.cm.doc.getValue().split('\n')
      return EditorShareJsCodec.shareJsOffsetToRowColumn(offset, lines)
    }
  }
  return TrackChangesAdapter
})
