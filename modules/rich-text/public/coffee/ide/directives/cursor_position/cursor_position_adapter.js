define [], () ->
  # Number of lines rendered above/below visible lines
  VIEWPORT_MARGIN = 10

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

    getEditorScrollPosition: () ->
      # CodeMirror renders some lines out of the viewport to improve scrolling
      # performance. We therefore have to add some extra lines onto the
      # calculation to account for this
      viewport = @editor.getCodeMirror().getViewport()
      viewport.from + VIEWPORT_MARGIN

    setCursor: (pos) ->
      pos = pos.cursorPosition or { row: 0, column: 0 }
      @editor.getCodeMirror().setCursor(@convertFromAcePos(pos))

    setEditorScrollPosition: (pos) ->
      pos = pos.firstVisibleLine or 0
      codeMirror = @editor.getCodeMirror()
      height = codeMirror.heightAtLine(pos, 'local')
      codeMirror.scrollTo(null, height)

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
