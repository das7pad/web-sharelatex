/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define([
  'ace/ace',
  'utils/EventEmitter',
  'ide/colors/ColorManager',
  'ide/editor/AceShareJsCodec'
], function(_, EventEmitter, ColorManager, AceShareJsCodec) {
  let TrackChangesManager
  return (TrackChangesManager = (function() {
    let Range
    TrackChangesManager = class TrackChangesManager {
      static initClass() {
        ;({ Range } = ace.require('ace/range'))

        this.prototype._doneUpdateThisLoop = false
        this.prototype._pendingUpdates = false
      }

      constructor($scope, editor, element, adapter) {
        this.onPaste = this.onPaste.bind(this)
        this.$scope = $scope
        this.editor = editor
        this.element = element
        this.adapter = adapter
        if (window.trackChangesManager == null) {
          window.trackChangesManager = this
        }

        this.$scope.$watch('trackChanges', track_changes => {
          if (track_changes == null) {
            return
          }
          return this.setTrackChanges(track_changes)
        })

        this.$scope.$watch('sharejsDoc', (doc, oldDoc) => {
          if (doc == null) {
            return
          }
          if (oldDoc != null) {
            this.disconnectFromDoc(oldDoc)
          }
          this.setTrackChanges(this.$scope.trackChanges)
          return this.connectToDoc(doc)
        })

        this.$scope.$on('comment:add', (e, thread_id, offset, length) => {
          return this.addCommentToSelection(thread_id, offset, length)
        })

        this.$scope.$on('comment:select_line', e => {
          return this.selectLineIfNoSelection()
        })

        this.$scope.$on('changes:accept', (e, change_ids) => {
          return this.acceptChangeIds(change_ids)
        })

        this.$scope.$on('changes:reject', (e, change_ids) => {
          return this.rejectChangeIds(change_ids)
        })

        this.$scope.$on('comment:remove', (e, comment_id) => {
          return this.removeCommentId(comment_id)
        })

        this.$scope.$on('comment:resolve_threads', (e, thread_ids) => {
          return this.hideCommentsByThreadIds(thread_ids)
        })

        this.$scope.$on('comment:unresolve_thread', (e, thread_id) => {
          return this.showCommentByThreadId(thread_id)
        })

        this.$scope.$on('review-panel:recalculate-screen-positions', () => {
          return this.recalculateReviewEntriesScreenPositions()
        })

        let changingSelection = false
        const onChangeSelection = () => {
          // Deletes can send about 5 changeSelection events, so
          // just act on the last one.
          if (!changingSelection) {
            changingSelection = true
            return this.$scope.$evalAsync(() => {
              changingSelection = false
              return this.updateFocus()
            })
          }
        }

        const onResize = () => {
          return this.recalculateReviewEntriesScreenPositions()
        }

        const onChangeSession = e => {
          this.clearAnnotations()
          this.redrawAnnotations()
          this.editor.session.on('changeScrollTop', onChangeScroll)
        }

        let _scrollTimeout = null
        const onChangeScroll = () => {
          if (_scrollTimeout != null) {
          } else {
            return (_scrollTimeout = setTimeout(() => {
              this.recalculateVisibleEntries()
              this.$scope.$apply()
              return (_scrollTimeout = null)
            }, 200))
          }
        }

        this._resetCutState()
        const onCut = () => this.onCut()
        const onPaste = () => this.onPaste()

        const bindToEditor = () => {
          if (this.editor) {
            this.editor.on('changeSelection', onChangeSelection)
            this.editor.on('change', onChangeSelection) // Selection also moves with updates elsewhere in the document
            this.editor.on('changeSession', onChangeSession)
            this.editor.on('cut', onCut)
            this.editor.on('paste', onPaste)
            this.editor.renderer.on('resize', onResize)
          } else {
            /**
              There was no changeSession event equivalent for CM where it would fire
              at the beginning of the first "session", so here I'm just doing the
              main thing I wanted onChangeSession to do for CM so it gets done the
              first time (otherwise I'm doing it in swapDoc)
              */

            this.redrawAnnotations()
            this.adapter.bindToEditor()
          }
        }

        const unbindFromEditor = () => {
          if (this.editor) {
            this.editor.off('changeSelection', onChangeSelection)
            this.editor.off('change', onChangeSelection)
            this.editor.off('changeSession', onChangeSession)
            this.editor.off('cut', onCut)
            this.editor.off('paste', onPaste)
            this.editor.renderer.off('resize', onResize)
          } else {
            this.adapter.unbindFromEditor()
          }
        }

        this.$scope.$watch('trackChangesEnabled', enabled => {
          if (enabled == null) {
            return
          }
          if (enabled) {
            bindToEditor()
          } else {
            unbindFromEditor()
          }
        })
      }

      disconnectFromDoc(doc) {
        this.adapter.changeIdToMarkerIdMap = {}
        doc.off('ranges:clear')
        doc.off('ranges:redraw')
        doc.off('ranges:dirty')
      }

      setTrackChanges(value) {
        if (value) {
          return this.$scope.sharejsDoc != null
            ? (this.$scope.sharejsDoc.track_changes_as =
                window.user.id || 'anonymous')
            : undefined
        } else {
          return this.$scope.sharejsDoc != null
            ? (this.$scope.sharejsDoc.track_changes_as = null)
            : undefined
        }
      }

      connectToDoc(doc) {
        this.rangesTracker = doc.ranges
        this.setTrackChanges(this.$scope.trackChanges)

        doc.on('ranges:dirty', () => {})
        this.updateAnnotations()
        doc.on('ranges:clear', () => {
          this.clearAnnotations()
        })
        doc.on('ranges:redraw', () => {
          this.redrawAnnotations()
        })
      }

      clearAnnotations() {
        const session = this.editor.getSession()
        for (let change_id in this.adapter.changeIdToMarkerIdMap) {
          const markers = this.adapter.changeIdToMarkerIdMap[change_id]
          for (let marker_name in markers) {
            const marker_id = markers[marker_name]
            session.removeMarker(marker_id)
          }
        }
        this.adapter.changeIdToMarkerIdMap = {}
      }

      redrawAnnotations() {
        for (let change of Array.from(this.rangesTracker.changes)) {
          if (change.op.i != null) {
            this.adapter.onInsertAdded(change)
          } else if (change.op.d != null) {
            this.adapter.onDeleteAdded(change)
          }
        }

        Array.from(this.rangesTracker.comments).map(comment => comment)
        this.broadcastChange()
      }

      updateAnnotations() {
        // Doc updates with multiple ops, like search/replace or block comments
        // will call this with every individual op in a single event loop. So only
        // do the first this loop, then schedule an update for the next loop for the rest.
        if (!this._doneUpdateThisLoop) {
          this._doUpdateAnnotations()
          this._doneUpdateThisLoop = true
          return setTimeout(() => {
            if (this._pendingUpdates) {
              this._doUpdateAnnotations()
            }
            this._doneUpdateThisLoop = false
            return (this._pendingUpdates = false)
          })
        } else {
          return (this._pendingUpdates = true)
        }
      }

      _doUpdateAnnotations() {
        let change, comment
        const dirty = this.rangesTracker.getDirtyState()

        let updateMarkers = false

        for (var id in dirty.change.added) {
          change = dirty.change.added[id]
          if (change.op.i != null) {
            this.adapter.onInsertAdded(change)
          } else if (change.op.d != null) {
            this.adapter.onDeleteAdded(change)
          }
        }
        for (id in dirty.change.removed) {
          change = dirty.change.removed[id]
          if (change.op.i != null) {
            this._onInsertRemoved(change)
          } else if (change.op.d != null) {
            this._onDeleteRemoved(change)
          }
        }
        for (id in dirty.change.moved) {
          change = dirty.change.moved[id]
          updateMarkers = true
          this._onChangeMoved(change)
        }

        for (id in dirty.comment.added) {
          comment = dirty.comment.added[id]
          this.onCommentAdded(comment)
        }
        for (id in dirty.comment.removed) {
          comment = dirty.comment.removed[id]
          this._onCommentRemoved(comment)
        }
        for (id in dirty.comment.moved) {
          comment = dirty.comment.moved[id]
          updateMarkers = true
          this._onCommentMoved(comment)
        }

        this.rangesTracker.resetDirtyState()
        if (updateMarkers) {
          this.editor.renderer.updateBackMarkers()
        }
        return this.broadcastChange()
      }

      addComment(offset, content, thread_id) {
        const op = { c: content, p: offset, t: thread_id }
        // @rangesTracker.applyOp op # Will apply via sharejs
        return this.$scope.sharejsDoc.submitOp(op)
      }

      addCommentToSelection(thread_id, offset, length) {
        const start = this.adapter.shareJsOffsetToAcePosition(offset)
        const end = this.adapter.shareJsOffsetToAcePosition(offset + length)
        const range = new Range(start.row, start.column, end.row, end.column)
        const content = this.editor.session.getTextRange(range)
        return this.addComment(offset, content, thread_id)
      }

      selectLineIfNoSelection() {
        if (this.editor.selection.isEmpty()) {
          return this.editor.selection.selectLine()
        }
      }

      acceptChangeIds(change_ids) {
        this.rangesTracker.removeChangeIds(change_ids)
        this.updateAnnotations()
        return this.updateFocus()
      }

      rejectChangeIds(change_ids) {
        const changes = this.rangesTracker.getChanges(change_ids)
        if (changes.length === 0) {
          return
        }

        // When doing bulk rejections, adjacent changes might interact with each other.
        // Consider an insertion with an adjacent deletion (which is a common use-case, replacing words):
        //
        //     "foo bar baz" -> "foo quux baz"
        //
        // The change above will be modeled with two ops, with the insertion going first:
        //
        //     foo quux baz
        //         |--| -> insertion of "quux", op 1, at position 4
        //             | -> deletion of "bar", op 2, pushed forward by "quux" to position 8
        //
        // When rejecting these changes at once, if the insertion is rejected first, we get unexpected
        // results. What happens is:
        //
        //     1) Rejecting the insertion deletes the added word "quux", i.e., it removes 4 chars
        //        starting from position 4;
        //
        //           "foo quux baz" -> "foo  baz"
        //                |--| -> 4 characters to be removed
        //
        //     2) Rejecting the deletion adds the deleted word "bar" at position 8 (i.e. it will act as if
        //        the word "quuux" was still present).
        //
        //            "foo  baz" -> "foo  bazbar"
        //                     | -> deletion of "bar" is reverted by reinserting "bar" at position 8
        //
        // While the intended result would be "foo bar baz", what we get is:
        //
        //      "foo  bazbar" (note "bar" readded at position 8)
        //
        // The issue happens because of step 1. To revert the insertion of "quux", 4 characters are deleted
        // from position 4. This includes the position where the deletion exists; when that position is
        // cleared, the RangesTracker considers that the deletion is gone and stops tracking/updating it.
        // As we still hold a reference to it, the code tries to revert it by readding the deleted text, but
        // does so at the outdated position (position 8, which was valid when "quux" was present).
        //
        // To avoid this kind of problem, we need to make sure that reverting operations doesn't affect
        // subsequent operations that come after. Reverse sorting the operations based on position will
        // achieve it; in the case above, it makes sure that the the deletion is reverted first:
        //
        //     1) Rejecting the deletion adds the deleted word "bar" at position 8
        //
        //            "foo quux baz" -> "foo quuxbar baz"
        //                                       | -> deletion of "bar" is reverted by
        //                                            reinserting "bar" at position 8
        //
        //     2) Rejecting the insertion deletes the added word "quux", i.e., it removes 4 chars
        //        starting from position 4 and achieves the expected result:
        //
        //           "foo quuxbar baz" -> "foo bar baz"
        //                |--| -> 4 characters to be removed

        changes.sort((a, b) => b.op.p - a.op.p)

        const session = this.editor.getSession()
        for (let change of Array.from(changes)) {
          if (change.op.d != null) {
            const content = change.op.d
            const position = this.adapter.shareJsOffsetToAcePosition(
              change.op.p
            )
            session.$fromReject = true // Tell track changes to cancel out delete
            session.insert(position, content)
            session.$fromReject = false
          } else if (change.op.i != null) {
            const start = this.adapter.shareJsOffsetToAcePosition(change.op.p)
            const end = this.adapter.shareJsOffsetToAcePosition(
              change.op.p + change.op.i.length
            )
            const editor_text = session
              .getDocument()
              .getTextRange({ start, end })
            if (editor_text !== change.op.i) {
              throw new Error(
                `Op to be removed (${JSON.stringify(
                  change.op
                )}), does not match editor text, '${editor_text}'`
              )
            }
            session.$fromReject = true
            session.remove({ start, end })
            session.$fromReject = false
          } else {
            throw new Error(`unknown change: ${JSON.stringify(change)}`)
          }
        }
        return setTimeout(() => this.updateFocus())
      }

      removeCommentId(comment_id) {
        this.rangesTracker.removeCommentId(comment_id)
        return this.updateAnnotations()
      }

      hideCommentsByThreadIds(thread_ids) {
        const resolve_ids = {}
        for (let id of Array.from(thread_ids)) {
          resolve_ids[id] = true
        }
        for (let comment of Array.from(
          (this.rangesTracker != null
            ? this.rangesTracker.comments
            : undefined) || []
        )) {
          if (resolve_ids[comment.op.t]) {
            this._onCommentRemoved(comment)
          }
        }
        return this.broadcastChange()
      }

      showCommentByThreadId(thread_id) {
        for (let comment of Array.from(
          (this.rangesTracker != null
            ? this.rangesTracker.comments
            : undefined) || []
        )) {
          if (comment.op.t === thread_id) {
            this.onCommentAdded(comment)
          }
        }
        return this.broadcastChange()
      }

      _resetCutState() {
        return (this._cutState = {
          text: null,
          comments: [],
          docId: null
        })
      }

      onCut() {
        this._resetCutState()
        const selection = this.editor.getSelectionRange()
        const selection_start = this._aceRangeToShareJs(selection.start)
        const selection_end = this._aceRangeToShareJs(selection.end)
        this._cutState.text = this.editor.getSelectedText()
        this._cutState.docId = this.$scope.docId
        return (() => {
          const result = []
          for (let comment of Array.from(this.rangesTracker.comments)) {
            const comment_start = comment.op.p
            const comment_end = comment_start + comment.op.c.length
            if (
              selection_start <= comment_start &&
              comment_end <= selection_end
            ) {
              result.push(
                this._cutState.comments.push({
                  offset: comment.op.p - selection_start,
                  text: comment.op.c,
                  comment
                })
              )
            } else {
              result.push(undefined)
            }
          }
          return result
        })()
      }

      onPaste() {
        return this.editor.once('change', change => {
          if (change.action !== 'insert') {
            return
          }
          const pasted_text = change.lines.join('\n')
          const paste_offset = this._aceRangeToShareJs(change.start)
          // We have to wait until the change has been processed by the range tracker,
          // since if we move the ops into place beforehand, they will be moved again
          // when the changes are processed by the range tracker. This ranges:dirty
          // event is fired after the doc has applied the changes to the range tracker.
          return this.$scope.sharejsDoc.on('ranges:dirty.paste', () => {
            this.$scope.sharejsDoc.off('ranges:dirty.paste') // Doc event emitter uses namespaced events
            if (
              pasted_text === this._cutState.text &&
              this.$scope.docId === this._cutState.docId
            ) {
              for (let { comment, offset, text } of Array.from(
                this._cutState.comments
              )) {
                const op = { c: text, p: paste_offset + offset, t: comment.id }
                this.$scope.sharejsDoc.submitOp(op)
              } // Resubmitting an existing comment op (by thread id) will move it
            }
            this._resetCutState()
            // Check that comments still match text. Will throw error if not.
            return this.rangesTracker.validate(this.editor.getValue())
          })
        })
      }

      checkMapping() {
        // TODO: reintroduce this check
        let background_marker_id, callout_marker_id, end, marker, op, start
        const session = this.editor.getSession()

        // Make a copy of session.getMarkers() so we can modify it
        const markers = {}
        const object = session.getMarkers()
        for (var marker_id in object) {
          marker = object[marker_id]
          markers[marker_id] = marker
        }

        const expected_markers = []
        for (var change of Array.from(this.rangesTracker.changes)) {
          if (this.adapter.changeIdToMarkerIdMap[change.id] != null) {
            ;({ op } = change)
            ;({
              background_marker_id,
              callout_marker_id
            } = this.adapter.changeIdToMarkerIdMap[change.id])
            start = this.adapter.shareJsOffsetToAcePosition(op.p)
            if (op.i != null) {
              end = this.adapter.shareJsOffsetToAcePosition(op.p + op.i.length)
            } else if (op.d != null) {
              end = start
            }
            expected_markers.push({
              marker_id: background_marker_id,
              start,
              end
            })
            expected_markers.push({
              marker_id: callout_marker_id,
              start,
              end: start
            })
          }
        }

        for (let comment of Array.from(this.rangesTracker.comments)) {
          if (this.adapter.changeIdToMarkerIdMap[comment.id] != null) {
            ;({
              background_marker_id,
              callout_marker_id
            } = this.adapter.changeIdToMarkerIdMap[comment.id])
            start = this.adapter.shareJsOffsetToAcePosition(comment.op.p)
            end = this.adapter.shareJsOffsetToAcePosition(
              comment.op.p + comment.op.c.length
            )
            expected_markers.push({
              marker_id: background_marker_id,
              start,
              end
            })
            expected_markers.push({
              marker_id: callout_marker_id,
              start,
              end: start
            })
          }
        }

        for ({ marker_id, start, end } of Array.from(expected_markers)) {
          marker = markers[marker_id]
          delete markers[marker_id]
          if (
            marker.range.start.row !== start.row ||
            marker.range.start.column !== start.column ||
            marker.range.end.row !== end.row ||
            marker.range.end.column !== end.column
          ) {
            console.error("Change doesn't match marker anymore", {
              change,
              marker,
              start,
              end
            })
          }
        }

        return (() => {
          const result = []
          for (marker_id in markers) {
            marker = markers[marker_id]
            if (/track-changes/.test(marker.clazz)) {
              result.push(console.error('Orphaned ace marker', marker))
            } else {
              result.push(undefined)
            }
          }
          return result
        })()
      }

      updateFocus() {
        const selection = this.editor.getSelectionRange()
        const selection_start = this._aceRangeToShareJs(selection.start)
        const selection_end = this._aceRangeToShareJs(selection.end)
        const entries = this._getCurrentDocEntries()
        const is_selection = selection_start !== selection_end
        return this.$scope.$emit(
          'editor:focus:changed',
          selection_start,
          selection_end,
          is_selection
        )
      }

      broadcastChange() {
        return this.$scope.$emit(
          'editor:track-changes:changed',
          this.$scope.docId
        )
      }

      recalculateReviewEntriesScreenPositions() {
        const session = this.editor.getSession()
        const { renderer } = this.editor
        const { firstRow, lastRow } = renderer.layerConfig
        const entries = this._getCurrentDocEntries()
        const object = entries || {}
        for (let entry_id in object) {
          const entry = object[entry_id]
          const doc_position = this.adapter.shareJsOffsetToAcePosition(
            entry.offset
          )
          const screen_position = session.documentToScreenPosition(
            doc_position.row,
            doc_position.column
          )
          const y = screen_position.row * renderer.lineHeight
          if (entry.screenPos == null) {
            entry.screenPos = {}
          }
          entry.screenPos.y = y
          entry.docPos = doc_position
        }
        this.recalculateVisibleEntries()
        return this.$scope.$apply()
      }

      recalculateVisibleEntries() {
        const OFFSCREEN_ROWS = 20
        const CULL_AFTER = 100 // With less than this number of entries, don't bother culling to avoid little UI jumps when scrolling.
        const { firstRow, lastRow } = this.editor.renderer.layerConfig
        const entries = this._getCurrentDocEntries() || {}
        const entriesLength = Object.keys(entries).length
        let changed = false
        for (let entry_id in entries) {
          const entry = entries[entry_id]
          const old = entry.visible
          entry.visible =
            entriesLength < CULL_AFTER ||
            (firstRow - OFFSCREEN_ROWS <= entry.docPos.row &&
              entry.docPos.row <= lastRow + OFFSCREEN_ROWS)
          if (entry.visible !== old) {
            changed = true
          }
        }
        if (changed) {
          return this.$scope.$emit('editor:track-changes:visibility_changed')
        }
      }

      _getCurrentDocEntries() {
        const doc_id = this.$scope.docId
        const entries =
          this.$scope.reviewPanel.entries[doc_id] != null
            ? this.$scope.reviewPanel.entries[doc_id]
            : (this.$scope.reviewPanel.entries[doc_id] = {})
        return entries
      }

      _onInsertRemoved(change) {
        const {
          background_marker_id,
          callout_marker_id
        } = this.adapter.changeIdToMarkerIdMap[change.id]
        delete this.adapter.changeIdToMarkerIdMap[change.id]
        const session = this.editor.getSession()
        session.removeMarker(background_marker_id)
        return session.removeMarker(callout_marker_id)
      }

      _onDeleteRemoved(change) {
        const {
          background_marker_id,
          callout_marker_id
        } = this.adapter.changeIdToMarkerIdMap[change.id]
        delete this.adapter.changeIdToMarkerIdMap[change.id]
        const session = this.editor.getSession()
        session.removeMarker(background_marker_id)
        return session.removeMarker(callout_marker_id)
      }

      onCommentAdded(comment) {
        if (this.rangesTracker.resolvedThreadIds[comment.op.t]) {
          // Comment is resolved so shouldn't be displayed.
          return
        }
        if (this.changeIdToMarkerIdMap[comment.id] == null) {
          // Only create new markers if they don't already exist
          const start = this.shareJsOffsetToAcePosition(comment.op.p)
          const end = this.shareJsOffsetToAcePosition(
            comment.op.p + comment.op.c.length
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
            'track-changes-marker track-changes-comment-marker',
            'text'
          )
          const callout_marker_id = this.createCalloutMarker(
            start,
            'track-changes-comment-marker-callout'
          )
          return (this.changeIdToMarkerIdMap[comment.id] = {
            background_marker_id,
            callout_marker_id
          })
        }
      }

      _onCommentRemoved(comment) {
        if (this.adapter.changeIdToMarkerIdMap[comment.id] != null) {
          // Resolved comments may not have marker ids
          const {
            background_marker_id,
            callout_marker_id
          } = this.adapter.changeIdToMarkerIdMap[comment.id]
          delete this.adapter.changeIdToMarkerIdMap[comment.id]
          const session = this.editor.getSession()
          session.removeMarker(background_marker_id)
          return session.removeMarker(callout_marker_id)
        }
      }

      _aceRangeToShareJs(range) {
        const lines = this.editor
          .getSession()
          .getDocument()
          .getLines(0, range.row)
        return AceShareJsCodec.aceRangeToShareJs(range, lines)
      }

      _aceChangeToShareJs(delta) {
        const lines = this.editor
          .getSession()
          .getDocument()
          .getLines(0, delta.start.row)
        return AceShareJsCodec.aceChangeToShareJs(delta, lines)
      }

      _onChangeMoved(change) {
        let end
        const start = this.adapter.shareJsOffsetToAcePosition(change.op.p)
        if (change.op.i != null) {
          end = this.adapter.shareJsOffsetToAcePosition(
            change.op.p + change.op.i.length
          )
        } else {
          end = start
        }
        return this._updateMarker(change.id, start, end)
      }

      _onCommentMoved(comment) {
        const start = this.adapter.shareJsOffsetToAcePosition(comment.op.p)
        const end = this.adapter.shareJsOffsetToAcePosition(
          comment.op.p + comment.op.c.length
        )
        return this._updateMarker(comment.id, start, end)
      }

      _updateMarker(change_id, start, end) {
        if (this.adapter.changeIdToMarkerIdMap[change_id] == null) {
          return
        }
        const session = this.editor.getSession()
        const markers = session.getMarkers()
        const {
          background_marker_id,
          callout_marker_id
        } = this.adapter.changeIdToMarkerIdMap[change_id]
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
    }
    TrackChangesManager.initClass()
    return TrackChangesManager
  })())
})
