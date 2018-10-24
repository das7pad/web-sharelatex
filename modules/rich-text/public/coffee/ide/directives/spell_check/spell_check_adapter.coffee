define [], () ->
  class SpellCheckAdapter
    constructor: (@editor) ->
      @highlightedWordManager = @editor.highlightedWordManager

    getLines: () ->
      @editor.getCodeMirror().getValue().split('\n')

    normalizeChangeEvent: (e) ->
      return {
        start: { row: e.from.line, },
        end: { row: e.to.line },
        action: if e.removed? then 'remove' else 'insert'
      }

    getCoordsFromContextMenuEvent: (e) ->
      e.stopPropagation()
      return {
        x: e.pageX
        y: e.pageY
      }

    isContextMenuEventOnBottomHalf: (e) -> 
      clientY = e.clientY
      editorBoundingRect = e.currentTarget.getBoundingClientRect()
      relativeYPos = (clientY - editorBoundingRect.top) / editorBoundingRect.height
      return relativeYPos > 0.5
      
    preventContextMenuEventDefault: (e) ->
      e.preventDefault()

    getHighlightFromCoords: (coords) ->
      position = @editor.getCodeMirror().coordsChar({
        left: coords.x,
        top: coords.y
      })
      @highlightedWordManager.findHighlightAtPosition(position)

    selectHighlightedWord: (highlight) ->
      position = highlight.marker.find()
      @editor.getCodeMirror().setSelection(position.from, position.to)

    replaceWord: (highlight, newWord) =>
      codeMirror = @editor.getCodeMirror()
      codeMirror.replaceSelection(newWord)
      codeMirror.focus()
