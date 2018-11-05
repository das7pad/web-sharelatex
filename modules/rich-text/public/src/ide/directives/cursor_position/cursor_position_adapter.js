/* eslint-disable
    no-undef,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define([], function() {
  // Number of lines rendered above/below visible lines
  let CursorPositionAdapter
  const VIEWPORT_MARGIN = 10

  return (CursorPositionAdapter = class CursorPositionAdapter {
    constructor(editor) {
      this.getCursor = this.getCursor.bind(this)
      this.editor = editor
    }

    convertToAcePos({ line, ch }) {
      return {
        row: line,
        column: ch
      }
    }

    convertFromAcePos({ row, column }) {
      return {
        line: row,
        ch: column
      }
    }

    getCursor() {
      return this.convertToAcePos(this.editor.getCodeMirror().getCursor())
    }

    getEditorScrollPosition() {
      // CodeMirror renders some lines out of the viewport to improve scrolling
      // performance. We therefore have to add some extra lines onto the
      // calculation to account for this
      const viewport = this.editor.getCodeMirror().getViewport()
      return viewport.from + VIEWPORT_MARGIN
    }

    setCursor(pos) {
      pos = pos.cursorPosition || { row: 0, column: 0 }
      return this.editor.getCodeMirror().setCursor(this.convertFromAcePos(pos))
    }

    setEditorScrollPosition(pos) {
      pos = pos.firstVisibleLine || 0
      const codeMirror = this.editor.getCodeMirror()
      const height = codeMirror.heightAtLine(pos, 'local')
      return codeMirror.scrollTo(null, height)
    }

    clearSelection() {}
    // This method is only used by track changes, which rich text does not
    // (yet) support. Therefore it is left as a no-op

    gotoLine(line, ch) {
      const codeMirror = this.editor.getCodeMirror()
      codeMirror.setCursor({ line, ch })
      return codeMirror.focus()
    }

    gotoOffset() {}
  })
})
// This method is only used by track changes, which rich text does not
// (yet) support. Therefore it is left as a no-op
