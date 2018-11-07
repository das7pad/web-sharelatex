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
      this.clearAnnotations = this.clearAnnotations.bind(this)
      this.redrawAnnotations = this.redrawAnnotations.bind(this)
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

    connectToDoc(doc) {
      this.rangesTracker = doc.ranges

      doc.on('ranges:dirty', () => {})
      // TODO will put this back later
      // @updateAnnotations()
      doc.on('ranges:clear', () => {
        return this.clearAnnotations()
      })
      return doc.on('ranges:redraw', () => {
        return this.redrawAnnotations()
      })
    }

    disconnectFromDoc(doc) {
      this.changeIdToMarkerIdMap = {}
      doc.off('ranges:clear')
      doc.off('ranges:redraw')
      return doc.off('ranges:dirty')
    }

    bindToEditor() {
      // Couldn't find a suitable event for an onload sort of thing
      // So this isn't really binding anything but needed to load the annotations at this time
      return this.loadAnnotations()
    }
    // TODO fill these up

    unbindFromEditor() {}
    // TODO fill these up

    loadAnnotations() {
      // TODO
      // @clearAnnotations()
      return this.redrawAnnotations()
    }
    // @editor.session.on "changeScrollTop", onChangeScroll
    // @clearAnnotations()

    clearAnnotations() {}
    // TODO
    // session = @editor.getSession()
    // for change_id, markers of @adapter.changeIdToMarkerIdMap
    // 	for marker_name, marker_id of markers
    // 		session.removeMarker marker_id
    // @adapter.changeIdToMarkerIdMap = {}

    redrawAnnotations() {
      for (let change of Array.from(this.rangesTracker.changes)) {
        if (change.op.i != null) {
          this.onInsertAdded(change)
        } else if (change.op.d != null) {
          this.onDeleteAdded(change)
        }
      }

      return Array.from(this.rangesTracker.comments).map(comment =>
        this.onCommentAdded(comment)
      )
    }

    // TODO you will need to put this back in but will think about it later
    // @broadcastChange()

    onInsertAdded(change) {
      let position
      return (position = this.shareJsOffsetToAcePosition(change.op.p))
    }
    // cm.addWidget(pos: position, node: Element, scrollIntoView: boolean)
    // callout_marker_id = @createCalloutMarker(start, "track-changes-added-marker-callout")
    // @changeIdToMarkerIdMap[change.id] = { background_marker_id, callout_marker_id }

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
