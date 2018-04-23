define [
  "base"
  "ide/rich-text/rich_text_adapter"
], (App, RichTextAdapter) ->
  App.directive "cmEditor", (ide) ->
    return {
      scope: {
        sharejsDoc: "="
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
