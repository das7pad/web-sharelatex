define [
  "base"
  "ide/rich-text/rich_text_adapter"
  "ide/editor/directives/aceEditor/spell-check/SpellCheckManager"
], (App, RichTextAdapter, SpellCheckManager) ->
  App.directive "cmEditor", (ide, $cacheFactory, $http, $q) ->
    return {
      scope: {
        sharejsDoc: "="
        spellCheck: "="
        spellCheckLanguage: "="
      }

      link: (scope, element, attrs) ->
        richText = null
        adapter = new RichTextAdapter(ide.fileTreeManager)

        init = () ->
          requirejs ['rich-text'], ({ Editor }) ->
            richText = new Editor(
              element.find('.cm-editor-body')[0],
              adapter
            )
            switchAttachment(scope.sharejsDoc)

        scope.$watch "sharejsDoc", switchAttachment

        switchAttachment = (sharejsDoc, oldSharejsDoc) ->
          return if sharejsDoc == oldSharejsDoc
          if oldSharejsDoc?
            detachFromCM(oldSharejsDoc)
          if sharejsDoc?
            attachToCM(sharejsDoc)

        attachToCM = (sharejsDoc) ->
          codeMirror = richText.getCodeMirror()
          return if !codeMirror
          scope.$applyAsync () ->
            richText.openDoc(sharejsDoc.getSnapshot())
            sharejsDoc.attachToCM(codeMirror)
            richText.enable()
            sharejsDoc.on "remoteop.richtext", richText.update
            attachToSpellCheck()

        detachFromCM = (sharejsDoc) ->
          sharejsDoc.detachFromCM()
          sharejsDoc.off "remoteop.richtext"

        handleChangeForSpellCheck = (_, event) ->
          @spellCheckManager.onChange(event)

        handleContextMenu = (_, event) ->
          @spellCheckManager.onContextMenu(event)

        attachToSpellCheck = () ->
          spellCheckCache = $cacheFactory.get("spellCheck-#{scope.name}") ||
            $cacheFactory("spellCheck-#{scope.name}", { capacity: 1000 })
          @spellCheckManager = new SpellCheckManager(
            scope,
            spellCheckCache,
            $http,
            $q,
            new SpellCheckAdapter(richText)
          )
          @spellCheckManager.init()
          codeMirror = richText.getCodeMirror()
          codeMirror.on 'change', handleChangeForSpellCheck
          codeMirror.on 'contextmenu', handleContextMenu
          codeMirror.on 'scroll', @spellCheckManager?.onScroll

        detachFromSpellCheck = () ->
          codeMirror = richText.getCodeMirror()
          codeMirror.off 'change', handleChangeForSpellCheck
          codeMirror.off 'contextmenu', handleContextMenu
          codeMirror.off 'scroll', @spellCheckManager?.onScroll

        scope.$on '$destroy', () ->
          detachFromSpellCheck()
          detachFromCM(scope.sharejsDoc)
          richText.disable()

        init()

      template: """
        <div class="cm-editor-wrapper rich-text">
          <div class="cm-editor-body">
          <spell-menu
            open="spellMenu.open"
            top="spellMenu.top"
            left="spellMenu.left"
            highlight="spellMenu.highlight"
            replace-word="replaceWord(highlight, suggestion)"
            learn-word="learnWord(highlight)"
          ></spell-menu>
        </div>
      """
    }

  class SpellCheckAdapter
    constructor: (@editor) ->
      @wordManager = @editor.wordManager
    getLines: () -> @editor.getCodeMirror().getValue().split('\n')
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
    preventContextMenuEventDefault: (e) ->
      e.preventDefault()
    getHighlightFromCoords: (coords) ->
      position = @editor.getCodeMirror().coordsChar({
        left: coords.x,
        top: coords.y
      })
      @wordManager.findHighlightAtPosition(position)
    selectHighlightedWord: (highlight) ->
      position = highlight.marker.find()
      # TODO: handle removed markers?
      @editor.getCodeMirror().setSelection(position.from, position.to)
    replaceWord: (highlight, newWord) =>
      codeMirror = @editor.getCodeMirror()
      codeMirror.replaceSelection(newWord)
      codeMirror.focus()
