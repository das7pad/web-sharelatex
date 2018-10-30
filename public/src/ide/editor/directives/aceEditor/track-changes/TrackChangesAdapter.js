/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
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
				this.editor = editor;
				this.changeIdToMarkerIdMap = {};
			}

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