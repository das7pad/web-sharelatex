/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define([
	"ace/ace",
	"ide/editor/AceShareJsCodec"
], function(Ace, AceShareJsCodec) {
	let TrackChangesAdapter;
	return TrackChangesAdapter = (function() {
		let Range = undefined;
		TrackChangesAdapter = class TrackChangesAdapter {
			static initClass() {
				({ Range } = ace.require("ace/range"));
			}

			constructor(editor) {
				this.bindToEditor = this.bindToEditor.bind(this);
				this.unbindFromEditor = this.unbindFromEditor.bind(this);
				this.onChangeSession = this.onChangeSession.bind(this);
				this.editor = editor;
				this.changeIdToMarkerIdMap = {};
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
				// @TODO put these back in
				// @editor.on "changeSelection", onChangeSelection
				// @editor.on "change", onChangeSelection # Selection also moves with updates elsewhere in the document
				return this.editor.on("changeSession", this.onChangeSession);
			}
				// @editor.on "cut", onCut
				// @editor.on "paste", onPaste
				// @editor.renderer.on "resize", onResize

			unbindFromEditor() {
				// @TODO put these back in
				// @editor.off "changeSelection", onChangeSelection
				// @editor.off "change", onChangeSelection
				return this.editor.off("changeSession", this.onChangeSession);
			}
				// @editor.off "cut", onCut
				// @editor.off "paste", onPaste
				// @editor.renderer.off "resize", onResize

			onChangeSession(e) {
				this.clearAnnotations();
				return this.redrawAnnotations();
			}
				// @TODO put onChangeScroll back in
				// @editor.session.on "changeScrollTop", onChangeScroll

			clearAnnotations() {
				const session = this.editor.getSession();
				for (let change_id in this.changeIdToMarkerIdMap) {
					const markers = this.changeIdToMarkerIdMap[change_id];
					for (let marker_name in markers) {
						const marker_id = markers[marker_name];
						session.removeMarker(marker_id);
					}
				}
				return this.changeIdToMarkerIdMap = {};
			}

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
				// @TODO Put this back in
				// @broadcastChange()

			onInsertAdded(change) {
				const start = this.shareJsOffsetToAcePosition(change.op.p);
				const end = this.shareJsOffsetToAcePosition(change.op.p + change.op.i.length);
				const session = this.editor.getSession();
				const doc = session.getDocument();
				const background_range = new Range(start.row, start.column, end.row, end.column);
				const background_marker_id = session.addMarker(background_range, "track-changes-marker track-changes-added-marker", "text");
				const callout_marker_id = this.createCalloutMarker(start, "track-changes-added-marker-callout");
				return this.changeIdToMarkerIdMap[change.id] = { background_marker_id, callout_marker_id };
			}

			onDeleteAdded(change) {
				const position = this.shareJsOffsetToAcePosition(change.op.p);
				const session = this.editor.getSession();
				const doc = session.getDocument();

				const markerLayer = this.editor.renderer.$markerBack;
				const klass = "track-changes-marker track-changes-deleted-marker";
				const background_range = this.makeZeroWidthRange(position);
				const background_marker_id = session.addMarker(background_range, klass, (html, range, left, top, config) => markerLayer.drawSingleLineMarker(html, range, `${klass} ace_start`, config, 0, ""));

				const callout_marker_id = this.createCalloutMarker(position, "track-changes-deleted-marker-callout");
				return this.changeIdToMarkerIdMap[change.id] = { background_marker_id, callout_marker_id };
			}

			onCommentAdded(comment) {
				if (this.rangesTracker.resolvedThreadIds[comment.op.t]) {
					// Comment is resolved so shouldn't be displayed.
					return;
				}
				if ((this.changeIdToMarkerIdMap[comment.id] == null)) {
					// Only create new markers if they don't already exist
					const start = this.shareJsOffsetToAcePosition(comment.op.p);
					const end = this.shareJsOffsetToAcePosition(comment.op.p + comment.op.c.length);
					const session = this.editor.getSession();
					const doc = session.getDocument();
					const background_range = new Range(start.row, start.column, end.row, end.column);
					const background_marker_id = session.addMarker(background_range, "track-changes-marker track-changes-comment-marker", "text");
					const callout_marker_id = this.createCalloutMarker(start, "track-changes-comment-marker-callout");
					return this.changeIdToMarkerIdMap[comment.id] = { background_marker_id, callout_marker_id };
				}
			}

			shareJsOffsetToAcePosition(offset) {
				const lines = this.editor.getSession().getDocument().getAllLines();
				return AceShareJsCodec.shareJsOffsetToAcePosition(offset, lines);
			}

			createCalloutMarker(position, klass) {
				let callout_marker_id;
				const session = this.editor.getSession();
				const callout_range = this.makeZeroWidthRange(position);
				const markerLayer = this.editor.renderer.$markerBack;
				return callout_marker_id = session.addMarker(callout_range, klass, (html, range, left, top, config) => markerLayer.drawSingleLineMarker(html, range, `track-changes-marker-callout ${klass} ace_start`, config, 0, "width: auto; right: 0;"));
			}

			makeZeroWidthRange(position) {
				const ace_range = new Range(position.row, position.column, position.row, position.column);
				// Our delete marker is zero characters wide, but Ace doesn't draw ranges
				// that are empty. So we monkey patch the range to tell Ace it's not empty.
				// We do want to claim to be empty if we're off screen after clipping rows though.
				// This is the code we need to trick:
				//   var range = marker.range.clipRows(config.firstRow, config.lastRow);
				//   if (range.isEmpty()) continue;
				ace_range.clipRows = function(first_row, last_row) {
					this.isEmpty = function() {
						return (first_row > this.end.row) || (last_row < this.start.row);
					};
					return this;
				};
				return ace_range;
			}
		};
		TrackChangesAdapter.initClass();
		return TrackChangesAdapter;
	})();
});