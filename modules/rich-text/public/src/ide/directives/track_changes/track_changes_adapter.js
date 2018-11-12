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
      this.loadAnnotations = this.loadAnnotations.bind(this)
      this.onInsertAdded = this.onInsertAdded.bind(this)
      this.shareJsOffsetToAcePosition = this.shareJsOffsetToAcePosition.bind(
        this
      )
      this.getAllLines = this.getAllLines.bind(this)
      this.onDeleteAdded = this.onDeleteAdded.bind(this)
      this.onCommentAdded = this.onCommentAdded.bind(this)
      this.editor = editor
      this.cm = this.editor.getCodeMirror()
    }

    bindToEditor() {
      // Couldn't find a suitable event for an onload sort of thing
      // So this isn't really binding anything but needed to load the annotations at this time
      this.loadAnnotations()
    }
    // TODO fill these up

    unbindFromEditor() {}
    // TODO fill these up

    loadAnnotations() {
      // TODO
      // @clearAnnotations()
      this.redrawAnnotations()
    }

    onInsertAdded(change) {
      let start, end
      start = this.shareJsOffsetToAcePosition(change.op.p)
      end = this.shareJsOffsetToAcePosition(change.op.p + change.op.i.length)
      this.cm.doc.markText(
        { line: start.row, ch: start.column },
        { line: end.row, ch: end.column },
        { className: 'track-changes-marker track-changes-added-marker' }
      )

      // callout_marker_id = @createCalloutMarker(start, "track-changes-added-marker-callout")
      // @changeIdToMarkerIdMap[change.id] = { background_marker_id, callout_marker_id }
    }

    shareJsOffsetToAcePosition(offset) {
      const lines = this.getAllLines()
      return AceShareJsCodec.shareJsOffsetToAcePosition(offset, lines)
    }

    getAllLines() {
      const lines = []
      for (let leaf of Array.from(this.cm.doc.children)) {
        for (let line of Array.from(leaf.lines)) {
          lines.push(line.text)
        }
      }
      return lines
    }

    onDeleteAdded() {}
    // TODO

    onCommentAdded() {}
  })
})
// TODO
