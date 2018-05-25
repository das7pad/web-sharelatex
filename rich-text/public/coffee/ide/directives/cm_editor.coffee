define [
  "base"
  "ide/rich-text/rich_text_adapter"
  "ide/editor/directives/aceEditor/spell-check/SpellCheckManager"
  "ide/rich-text/directives/spell_check/spell_check_adapter"
], (App, RichTextAdapter, SpellCheckManager, SpellCheckAdapter) ->
  App.directive "cmEditor", (ide, $cacheFactory, $http, $q) ->
    return {
      scope: {
        editor: "="
        initCodeMirror: "="
        sharejsDoc: "="
        spellCheck: "="
        spellCheckLanguage: "="
      }

      link: (scope, element, attrs) ->
        # Call parent to initialise CodeMirror instance if it's not already
        if !scope.editor
          scope.initCodeMirror(element.find('.cm-editor-body')[0])

        # Wait until CodeMirror editor is loaded, then attach to CM
        scope.$watch "editor", (val) ->
          return if !val
          switchAttachment(scope.sharejsDoc)

        switchAttachment = (sharejsDoc, oldSharejsDoc) ->
          return if sharejsDoc == oldSharejsDoc
          if oldSharejsDoc?
            detachFromCM(oldSharejsDoc)
          if sharejsDoc?
            attachToCM(sharejsDoc)

        # If doc is changed, switch the CodeMirror/ShareJS attachment
        scope.$watch "sharejsDoc", switchAttachment

        attachToCM = (sharejsDoc) ->
          scope.$applyAsync () ->
            scope.editor.openDoc(sharejsDoc.getSnapshot())
            sharejsDoc.attachToCM(scope.editor.getCodeMirror())
            scope.editor.enable()
            sharejsDoc.on "remoteop.richtext", scope.editor.update
            initSpellCheck()

        detachFromCM = (sharejsDoc) ->
          sharejsDoc.detachFromCM()
          sharejsDoc.off "remoteop.richtext"

        handleChangeForSpellCheck = (_, event) ->
          @spellCheckManager.onChange(event)

        initSpellCheck = () ->
          spellCheckCache = $cacheFactory.get("spellCheck-#{scope.name}") ||
            $cacheFactory("spellCheck-#{scope.name}", { capacity: 1000 })
          @spellCheckManager = new SpellCheckManager(
            scope,
            spellCheckCache,
            $http,
            $q,
            new SpellCheckAdapter(scope.editor)
          )
          @spellCheckManager.init()
          codeMirror = scope.editor.getCodeMirror()
          codeMirror.on 'change', handleChangeForSpellCheck
          $(codeMirror.getWrapperElement()).on(
            'contextmenu',
            @spellCheckManager.onContextMenu
          )
          codeMirror.on 'scroll', @spellCheckManager.onScroll

        tearDownSpellCheck = () ->
          codeMirror = scope.editor.getCodeMirror()
          codeMirror.off 'change', handleChangeForSpellCheck
          $(codeMirror.getWrapperElement()).off(
            'contextmenu',
            @spellCheckManager.onContextMenu
          )
          codeMirror.off 'scroll', @spellCheckManager.onScroll

        scope.$on '$destroy', () ->
          tearDownSpellCheck()
          detachFromCM(scope.sharejsDoc)
          scope.editor.disable()

        if attrs.resizeOn?
          for event in attrs.resizeOn.split(',')
            scope.$on event, () ->
              scope.editor?.getCodeMirror()?.refresh()

      template: """
        <div class="cm-editor-wrapper rich-text">
          <div class="cm-editor-body"></div>
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
