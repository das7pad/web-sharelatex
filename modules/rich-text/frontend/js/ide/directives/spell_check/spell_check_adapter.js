/* eslint-disable
    max-len,
    no-undef,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define([], function() {
  let SpellCheckAdapter
  return (SpellCheckAdapter = class SpellCheckAdapter {
    constructor(editor) {
      this.replaceWord = this.replaceWord.bind(this)
      this.editor = editor
      this.highlightedWordManager = this.editor.highlightedWordManager
    }

    getLines() {
      return this.editor
        .getCodeMirror()
        .getValue()
        .split('\n')
    }

    getLineCount() {
      return this.editor.getCodeMirror().lineCount()
    }

    getFirstVisibleRowNum() {
      return this.editor.getCodeMirror().getViewport().from
    }

    getLastVisibleRowNum() {
      return this.editor.getCodeMirror().getViewport().to
    }

    getLinesByRows(rows) {
      const doc = this.editor.getCodeMirror()
      return rows.map(rowIdx => doc.getLine(rowIdx))
    }

    getSelectionContents() {
      return this.editor.getCodeMirror().getSelection()
    }

    normalizeChangeEvent(e) {
      return {
        start: { row: e.from.line },
        end: { row: e.to.line },
        action: e.removed != null ? 'remove' : 'insert'
      }
    }

    getCoordsFromContextMenuEvent(e) {
      e.stopPropagation()
      return {
        x: e.pageX,
        y: e.pageY
      }
    }

    isContextMenuEventOnBottomHalf(e) {
      const { clientY } = e
      const editorBoundingRect = e.currentTarget.getBoundingClientRect()
      const relativeYPos =
        (clientY - editorBoundingRect.top) / editorBoundingRect.height
      return relativeYPos > 0.5
    }

    preventContextMenuEventDefault(e) {
      return e.preventDefault()
    }

    getHighlightFromCoords(coords) {
      const position = this.editor.getCodeMirror().coordsChar({
        left: coords.x,
        top: coords.y
      })
      return this.highlightedWordManager.findHighlightAtPosition(position)
    }

    selectHighlightedWord(highlight) {
      const position = highlight.marker.find()
      return this.editor
        .getCodeMirror()
        .setSelection(position.from, position.to)
    }

    replaceWord(highlight, newWord) {
      const codeMirror = this.editor.getCodeMirror()
      codeMirror.replaceSelection(newWord)
      return codeMirror.focus()
    }
  })
})
