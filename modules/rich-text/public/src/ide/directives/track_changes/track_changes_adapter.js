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
      this.bindToEditor = this.bindToEditor.bind(this)
      this.unbindFromEditor = this.unbindFromEditor.bind(this)
      this.updateFocus = this.updateFocus.bind(this)
      this.onInsertAdded = this.onInsertAdded.bind(this)
      this.onInsertRemoved = this.onInsertRemoved.bind(this)
      this.shareJsOffsetToAcePosition = this.shareJsOffsetToAcePosition.bind(
        this
      )
      this.onDeleteAdded = this.onDeleteAdded.bind(this)
      this.onDeleteRemoved = this.onDeleteRemoved.bind(this)
      this.onChangeMoved = this.onChangeMoved.bind(this)
      this.editor = editor
      this.cm = this.editor.getCodeMirror()
    }

    updateFocus() {
      // This is for the review panel updates, which isn't necessary now
      // But I didn't want Source erroring so thought I would move it early
    }

    bindToEditor() {
      // TODO fill these up with necessary equivalents
    }

    unbindFromEditor() {
      // TODO fill these up with necessary equivalents
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

    onDeleteAdded() {}

    onInsertRemoved(change) {
      /** For the moment I'm just going to do this bit
       - I think I need to take some action to remove the
       highlight itself but don't worry about it for a sec**/
      delete this.changeIdToMarkerIdMap[change.id]
    }

    onDeleteRemoved() {}

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
    }

    shareJsOffsetToAcePosition(offset) {
      const lines = this.cm.doc.getValue().split('\n')
      return AceShareJsCodec.shareJsOffsetToAcePosition(offset, lines)
    }
  })
})
// TODO
