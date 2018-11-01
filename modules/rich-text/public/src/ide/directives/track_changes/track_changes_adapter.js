/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define([], function() {
  let TrackChangesAdapter;
  return (TrackChangesAdapter = class TrackChangesAdapter {
    constructor(editor) {
      this.bindToEditor = this.bindToEditor.bind(this);
      this.unbindFromEditor = this.unbindFromEditor.bind(this);
      this.loadAnnotations = this.loadAnnotations.bind(this);
      this.clearAnnotations = this.clearAnnotations.bind(this);
      this.redrawAnnotations = this.redrawAnnotations.bind(this);
      this.onInsertAdded = this.onInsertAdded.bind(this);
      this.onDeleteAdded = this.onDeleteAdded.bind(this);
      this.onCommentAdded = this.onCommentAdded.bind(this);
      this.editor = editor;
      this.cm = this.editor.getCodeMirror();
    }

    connectToDoc(doc) {
      this.rangesTracker = doc.ranges;

      doc.on("ranges:dirty", () => {});
        // TODO will put this back later
        // @updateAnnotations()
      doc.on("ranges:clear", () => {
        return this.clearAnnotations();
      });
      return doc.on("ranges:redraw", () => {
        return this.redrawAnnotations();
      });
    }

    disconnectFromDoc(doc) {
      this.changeIdToMarkerIdMap = {};
      doc.off("ranges:clear");
      doc.off("ranges:redraw");
      return doc.off("ranges:dirty");
    }

    bindToEditor() {
      // Couldn't find a suitable event for an onload sort of thing
      // So this isn't really binding anything but needed to load the annotations at this time
      return this.loadAnnotations();
    }
      // TODO fill these up

    unbindFromEditor() {}
      // TODO fill these up

    loadAnnotations() {
      // TODO
      // @clearAnnotations()
      return this.redrawAnnotations();
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
          this.onInsertAdded(change);
        } else if (change.op.d != null) {
          this.onDeleteAdded(change);
        }
      }

      return Array.from(this.rangesTracker.comments).map((comment) =>
        this.onCommentAdded(comment));
    }

      // TODO you will need to put this back in but will think about it later
      // @broadcastChange()

    onInsertAdded() {
      // start = @shareJsOffsetToAcePosition(change.op.p)
      // end = @shareJsOffsetToAcePosition(change.op.p + change.op.i.length)
      // session = @editor.getSession()
      // doc = session.getDocument()
      // background_range = new Range(start.row, start.column, end.row, end.column)
      // background_marker_id = session.addMarker background_range, "track-changes-marker track-changes-added-marker", "text"
      // callout_marker_id = @createCalloutMarker(start, "track-changes-added-marker-callout")
      // @changeIdToMarkerIdMap[change.id] = { background_marker_id, callout_marker_id }

      //TODO shareJS bits, not thinking about that right now
      let background_range;
      return background_range = new Range(start.row, start.column, end.row, end.column);
    }

    onDeleteAdded() {}
      // TODO

    onCommentAdded() {}
  });
});
      // TODO
