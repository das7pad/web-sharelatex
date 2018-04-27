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
        cm = null
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
          return if !richText.getCodeMirror()
          scope.$applyAsync () ->
            richText.openDoc(sharejsDoc.getSnapshot())
            sharejsDoc.attachToCM(richText.getCodeMirror())
            sharejsDoc.on "remoteop.richtext", richText.update

            richText.enable (wordManager, updateSpellCheck) ->
              spellCheckCache = $cacheFactory.get("spellCheck-#{scope.name}") ||
                $cacheFactory("spellCheck-#{scope.name}", { capacity: 1000 })
              spellCheckManager = new SpellCheckManager(
                scope,
                richText.getCodeMirror(),
                element,
                spellCheckCache,
                $http,
                $q,
                wordManager,
                updateSpellCheck
              )
              spellCheckManager.enable()

        detachFromCM = (sharejsDoc) ->
          sharejsDoc.detachFromCM()
          sharejsDoc.off "remoteop.richtext"
          richText.disableRichText()

        scope.$on '$destroy', () ->
          detachFromCM(scope.sharejsDoc)
          richText.disable()

        init()

      template: """
        <div class="cm-editor-wrapper rich-text"></div>
      """
    }
