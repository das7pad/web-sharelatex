define [
  "base"
  "ide/rich-text/rich_text_adapter"
  "ide/editor/directives/aceEditor/spell-check/SpellCheckManager"
  "ide/rich-text/directives/spell_check/spell_check_adapter"
  "ide/rich-text/autocomplete_adapter"
], (App, RichTextAdapter, SpellCheckManager, SpellCheckAdapter, AutocompleteAdapter) ->
  App.directive "cmEditor", (ide, $cacheFactory, $http, $q) ->
    return {
      scope: {
        bundle: "="
        formattingEvents: "="
        initCodeMirror: "="
        sharejsDoc: "="
        spellCheck: "="
        spellCheckLanguage: "="
        autoCloseBrackets: "="
        fontSize: "="
        lineHeight: "="
      }

      link: (scope, element, attrs) ->
        bodyEl = element.find('.cm-editor-body')
        editor = null

        init = () ->
          editor = new scope.bundle.Editor(
            bodyEl[0],
            new RichTextAdapter(ide.fileTreeManager),
            new AutocompleteAdapter(),
            getSetting
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
          scope.formattingEvents.on 'section', () -> editor.wrapSection()
          scope.formattingEvents.on 'subsection', () -> editor.wrapSubsection()
          scope.formattingEvents.on 'bold', () -> editor.wrapBold()
          scope.formattingEvents.on 'italic', () -> editor.wrapItalic()
          scope.formattingEvents.on 'inlineMath', () -> editor.wrapInlineMath()
          scope.formattingEvents.on 'displayMath', () -> editor.wrapDisplayMath()
          scope.formattingEvents.on 'numberedList', () -> editor.wrapNumberedList()
          scope.formattingEvents.on 'bulletList', () -> editor.wrapBulletList()

        tearDownFormattingEventListeners = () ->
          scope.formattingEvents.off 'section'
          scope.formattingEvents.off 'subsection'
          scope.formattingEvents.off 'bold'
          scope.formattingEvents.off 'italic'
          scope.formattingEvents.off 'inlineMath'
          scope.formattingEvents.off 'displayMath'
          scope.formattingEvents.off 'numberedList'
          scope.formattingEvents.off 'bulletList'

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

        getSetting = (key) ->
          scope[key]

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

        scope.$watch 'fontSize', (value) ->
          bodyEl.css({ 'font-size': "#{value}px" })
          editor?.getCodeMirror()?.refresh()

        scope.$watch "lineHeight", (value) ->
          return if !value
          switch value
            when 'compact'
              lineHeight = 1.33
            when 'normal'
              lineHeight = 1.6
            when 'wide'
              lineHeight = 2
            else
              lineHeight = 1.6
          bodyEl.css({ 'line-height': lineHeight })
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
