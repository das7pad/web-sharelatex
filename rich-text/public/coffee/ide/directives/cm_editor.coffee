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
              element.find('.cm-editor-wrapper')[0],
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
          richText.disableRichText()

        handleChangeForSpellCheck = (_, event) ->
          @spellCheckManager.onChange(event)

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
          richText.getCodeMirror().on 'change', handleChangeForSpellCheck

        detachFromSpellCheck = () ->
          richText.getCodeMirror().off 'change', handleChangeForSpellCheck

        scope.$on 'destroy', () ->
          detachFromSpellCheck()
          detachFromCM(scope.sharejsDoc)
          richText.disable()

        init()

      template: """
        <div class="cm-editor-wrapper rich-text"></div>
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
    afterUpdate: () ->
      @editor.updateSpellOverlay()
