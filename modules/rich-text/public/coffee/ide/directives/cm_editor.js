define [
  "base"
  "ide/rich-text/rich_text_adapter"
  "ide/editor/directives/aceEditor/spell-check/SpellCheckManager"
  "ide/rich-text/directives/spell_check/spell_check_adapter"
  "ide/rich-text/autocomplete_adapter"
  "ide/editor/directives/aceEditor/cursor-position/CursorPositionManager"
  "ide/rich-text/directives/cursor_position/cursor_position_adapter"
], (App, RichTextAdapter, SpellCheckManager, SpellCheckAdapter, AutocompleteAdapter, CursorPositionManager, CursorPositionAdapter) ->
  App.directive "cmEditor", (ide, metadata, localStorage, $cacheFactory, $http, $q) ->
    return {
      scope: {
        bundle: "="
        formattingEvents: "="
        initCodeMirror: "="
        sharejsDoc: "="
        readOnly: "="
        spellCheck: "="
        spellCheckLanguage: "="
        autoComplete: "="
        autoCloseBrackets: "="
        fontSize: "="
        lineHeight: "="
        docId: "="
        onSave: "="
      }

      link: (scope, element, attrs) ->
        bodyEl = element.find('.cm-editor-body')
        editor = null
        cursorPositionManager = null
        autocompleteAdapter = new AutocompleteAdapter(
          scope,
          metadata,
          scope.$root._references
        )
        keyBindingsAdapter = {
          triggerRecompile: scope.onSave
          triggerSyncToPdf: triggerSyncToPdf
        }

        # Name the scope to be editor. This means that events prefixed with
        # `editor:` will listened for by the rich text editor
        scope.name = 'editor'

        init = () ->
          editor = new scope.bundle.Editor(
            bodyEl[0],
            new RichTextAdapter(ide.fileTreeManager),
            autocompleteAdapter,
            keyBindingsAdapter,
            getSetting
          )
          initCursorPosition()
          switchAttachment(scope.sharejsDoc)
          setUpFormattingEventListeners()

        switchAttachment = (sharejsDoc, oldSharejsDoc) ->
          return if sharejsDoc == oldSharejsDoc
          if oldSharejsDoc?
            scope.$broadcast('beforeChangeDocument')
            detachFromCM(oldSharejsDoc)
          if sharejsDoc?
            attachToCM(sharejsDoc)
          if sharejsDoc? and oldSharejsDoc?
            scope.$broadcast('afterChangeDocument')

        # If doc is changed, switch the CodeMirror/ShareJS attachment
        scope.$watch "sharejsDoc", switchAttachment

        scope.$watch "readOnly", (value) ->
          if value?
            editor.setReadOnly(value)

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

        # Trigger the event once *only* - this is called after CM is connected
        # to the ShareJs instance but this event should only be triggered the
        # first time the editor is opened. Not every time the docs opened
        triggerEditorInitEvent = _.once () ->
          scope.$broadcast('editorInit')

        attachToCM = (sharejsDoc) ->
          scope.$applyAsync () ->
            editor.openDoc(sharejsDoc.getSnapshot())
            sharejsDoc.attachToCM(editor.getCodeMirror())
            editor.enable()
            sharejsDoc.on "remoteop.richtext", () ->
              editor.update()
            # Clear undo history so that attaching to ShareJS isn't included
            editor.getCodeMirror().clearHistory()
            triggerEditorInitEvent()
            initSpellCheck()
            setUpMetadataEventListener()

        detachFromCM = (sharejsDoc) ->
          tearDownSpellCheck()
          tearDownMetadataEventListener()
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

        initCursorPosition = () ->
          cursorPositionManager = new CursorPositionManager(
            scope,
            new CursorPositionAdapter(editor),
            localStorage
          )
          editor.getCodeMirror().on(
            'cursorActivity',
            cursorPositionManager.onCursorChange
          )
          $(window).on 'unload', cursorPositionManager.onUnload

        tearDownCursorPosition = () ->
          editor.getCodeMirror().off(
            'cursorActivity',
            cursorPositionManager.onCursorChange
          )
          $(window).off 'unload', cursorPositionManager.onUnload

        triggerSyncToPdf = () ->
          cursorPositionManager.onSyncToPdf()

        setUpMetadataEventListener = () ->
          editor.getCodeMirror().on 'change', autocompleteAdapter.onChange

        tearDownMetadataEventListener = () ->
          editor.getCodeMirror().off 'change', autocompleteAdapter.onChange

        getSetting = (key) ->
          scope[key]

        scope.$on '$destroy', () ->
          scope.$broadcast('changeEditor')
          tearDownSpellCheck()
          tearDownCursorPosition()
          tearDownFormattingEventListeners()
          tearDownMetadataEventListener()
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
            layout-from-bottom="spellMenu.layoutFromBottom"
            highlight="spellMenu.highlight"
            replace-word="replaceWord(highlight, suggestion)"
            learn-word="learnWord(highlight)"
          ></spell-menu>
        </div>
      """
    }
