define [
  "base"
], (App) ->
  App.directive "cmEditor", () ->
    return {
      scope: {
        sharejsDoc: "="
      }

      link: (scope, element, attrs) ->
        cm = null
        richText = null

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

        detachFromCM = (sharejsDoc) ->
          sharejsDoc.detachFromCM()

        scope.$on 'destroy', () ->
          detachFromCM(scope.sharejsDoc)

      template: """
        <div class="cm-editor-wrapper"></div>
      """
    }
