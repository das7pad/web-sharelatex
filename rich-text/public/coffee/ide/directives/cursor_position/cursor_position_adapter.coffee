define [], () ->
  class CursorPositionAdapter
    constructor: (@editor) ->

    convertToAcePos: ({ line, ch }) ->
      return {
        row: line
        column: ch
      }

    convertFromAcePos: ({ row, column }) ->
      return {
        line: row,
        ch: column
      }

    getCursor: () =>
      @convertToAcePos(@editor.getCodeMirror().getCursor())

    getCursorForSession: (doc) ->
      @convertToAcePos(doc.getCursor())

    getScrollTopForSession: (doc) ->
      doc.scrollTop

    setCursor: (pos) ->
      pos = pos.cursorPosition or { line: 0, ch: 0 }
      @editor.getCodeMirror().setCursor(@convertFromAcePos(pos))

    setScrollTop: (pos) ->
      pos = pos.scrollTop or 0
      @editor.getCodeMirror().scrollTo(null, pos)

    clearSelection: () ->
      # This method is only used by track changes, which rich text does not
      # (yet) support. Therefore it is left as a no-op

    gotoLine: (line, ch) ->
      codeMirror = @editor.getCodeMirror()
      codeMirror.setCursor({ line: line, ch: ch })
      codeMirror.focus()

    gotoOffset: () ->
      # This method is only used by track changes, which rich text does not
      # (yet) support. Therefore it is left as a no-op

