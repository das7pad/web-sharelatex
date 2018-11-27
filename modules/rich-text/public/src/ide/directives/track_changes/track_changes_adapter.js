/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define(['ide/editor/AceShareJsCodec'], function(AceShareJsCodec) {
  let TrackChangesAdapter
  return (TrackChangesAdapter = class TrackChangesAdapter {
    constructor(editor) {
      this.onInsertAdded = this.onInsertAdded.bind(this)
      this.shareJsOffsetToAcePosition = this.shareJsOffsetToAcePosition.bind(
        this
      )
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
      start = this.shareJsOffsetToAcePosition(change.op.p)
      end = this.shareJsOffsetToAcePosition(change.op.p + change.op.i.length)
      marker = this.cm.doc.markText(
        { line: start.row, ch: start.column },
        { line: end.row, ch: end.column },
        { className: 'track-changes-marker track-changes-added-marker' }
      )
      this.changeIdToMarkerIdMap[change.id] = marker.id
    }

    onDeleteAdded(change) {
      let position, markerNode
      position = this.shareJsOffsetToAcePosition(change.op.p)

      markerNode = document.createElement('div')
      markerNode.style.borderBottom = '1px dashed #c5060b'
      markerNode.style.borderLeft = '1px dotted #c5060b'
      markerNode.style.width = '100%'
      markerNode.style.height = '20px'
      markerNode.style.marginTop = '-20px'

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
      const start = this.shareJsOffsetToAcePosition(change.op.p)
      if (change.op.i != null) {
        end = this.shareJsOffsetToAcePosition(change.op.p + change.op.i.length)
      } else {
        end = start
      }
      return this.updateMarker(change.id, start, end)
    }

    updateMarker(change_id, start, end) {
      // If it's not a delete
      if (start !== end) {
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
      } else {
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

    shareJsOffsetToAcePosition(offset) {
      const lines = this.cm.doc.getValue().split('\n')
      return AceShareJsCodec.shareJsOffsetToAcePosition(offset, lines)
    }
  })
})
