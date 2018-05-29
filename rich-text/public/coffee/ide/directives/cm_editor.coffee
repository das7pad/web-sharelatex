define [
  "base"
  "ide/rich-text/rich_text_adapter"
  "ide/editor/directives/aceEditor/spell-check/SpellCheckManager"
  "ide/rich-text/directives/spell_check/spell_check_adapter"
], (App, RichTextAdapter, SpellCheckManager, SpellCheckAdapter) ->
  App.directive "cmEditor", (ide, $cacheFactory, $http, $q) ->
    return {
      scope: {
        bundle: "="
        formattingEvents: "="
        initCodeMirror: "="
        sharejsDoc: "="
        spellCheck: "="
        spellCheckLanguage: "="
      }

      link: (scope, element, attrs) ->
        editor = null

        init = () ->
          editor = new scope.bundle.Editor(
            element.find('.cm-editor-body')[0],
            new RichTextAdapter(ide.fileTreeManager)
          )
          switchAttachment(scope.sharejsDoc)
          setUpFormattingEventListeners()

        switchAttachment = (sharejsDoc, oldSharejsDoc) ->
          return if sharejsDoc == oldSharejsDoc
          if oldSharejsDoc?
            detachFromCM(oldSharejsDoc)
          if sharejsDoc?
            attachToCM(sharejsDoc)

        # If doc is changed, switch the CodeMirror/ShareJS attachment
        scope.$watch "sharejsDoc", switchAttachment

        setUpFormattingEventListeners = () ->
          scope.formattingEvents.on "logEditor", () -> console.log(editor)

        tearDownFormattingEventListeners = () ->
          scope.formattingEvents.off "logEditor"

        attachToCM = (sharejsDoc) ->
          scope.$applyAsync () ->
            editor.openDoc(sharejsDoc.getSnapshot())
            sharejsDoc.attachToCM(editor.getCodeMirror())
            editor.enable()
            sharejsDoc.on "remoteop.richtext", editor.update
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
            new SpellCheckAdapter(editor)
          )
          @spellCheckManager.init()
          codeMirror = editor.getCodeMirror()
          codeMirror.on 'change', handleChangeForSpellCheck
          $(codeMirror.getWrapperElement()).on(
            'contextmenu',
            @spellCheckManager.onContextMenu
          )
          codeMirror.on 'scroll', @spellCheckManager.onScroll

        tearDownSpellCheck = () ->
          codeMirror = editor.getCodeMirror()
          codeMirror.off 'change', handleChangeForSpellCheck
          $(codeMirror.getWrapperElement()).off(
            'contextmenu',
            @spellCheckManager.onContextMenu
          )
          codeMirror.off 'scroll', @spellCheckManager.onScroll

        scope.$on '$destroy', () ->
          tearDownSpellCheck()
          tearDownFormattingEventListeners()
          detachFromCM(scope.sharejsDoc)
          editor.disable()

        init()

        if attrs.resizeOn?
          for event in attrs.resizeOn.split(',')
            scope.$on event, () ->
              editor?.getCodeMirror()?.refresh()

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
