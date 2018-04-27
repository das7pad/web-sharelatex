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
          requirejs ['rich-text'], (rt) ->
            richText = rt
            cm = richText.init(element.find('.cm-editor-wrapper')[0])
            switchAttachment(scope.sharejsDoc)

        scope.$watch "sharejsDoc", switchAttachment

        switchAttachment = (sharejsDoc, oldSharejsDoc) ->
          return if sharejsDoc == oldSharejsDoc
          if oldSharejsDoc?
            detachFromCM(oldSharejsDoc)
          if sharejsDoc?
            attachToCM(sharejsDoc)

        attachToCM = (sharejsDoc) ->
          return if !cm
          scope.$applyAsync () ->
            richText.openDoc(cm, sharejsDoc.getSnapshot())
            sharejsDoc.attachToCM(cm)
            richText.enableRichText(cm, adapter)
            sharejsDoc.on "remoteop.richtext", richText.updateRichText
            spellCheckCache = (
              $cacheFactory.get("spellCheck-#{scope.name}") ||
              $cacheFactory("spellCheck-#{scope.name}", { capacity: 1000 })
            )
            spellCheckManager = new SpellCheckManager(
              scope,
              cm,
              element,
              spellCheckCache,
              $http,
              $q,
              new richText.WordManager(),
              richText.updateSpellCheck
            )
            spellCheckManager.enable()

        detachFromCM = (sharejsDoc) ->
          sharejsDoc.detachFromCM()
          sharejsDoc.off "remoteop.richtext"
          richText.disableRichText()

        scope.$on '$destroy', () ->
          detachFromCM(scope.sharejsDoc)

        init()

      template: """
        <div class="cm-editor-wrapper rich-text"></div>
      """
    }
