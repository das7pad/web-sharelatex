/* eslint-disable
    max-len,
    no-undef,
    no-use-before-define,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define([
  "base",
  "ide/rich-text/rich_text_adapter",
  "ide/editor/directives/aceEditor/spell-check/SpellCheckManager",
  "ide/rich-text/directives/spell_check/spell_check_adapter",
  "ide/rich-text/autocomplete_adapter",
  "ide/editor/directives/aceEditor/cursor-position/CursorPositionManager",
  "ide/rich-text/directives/cursor_position/cursor_position_adapter"
], (App, RichTextAdapter, SpellCheckManager, SpellCheckAdapter, AutocompleteAdapter, CursorPositionManager, CursorPositionAdapter) =>
  App.directive("cmEditor", (ide, metadata, localStorage, $cacheFactory, $http, $q) =>
    ({
      scope: {
        bundle: "=",
        formattingEvents: "=",
        initCodeMirror: "=",
        sharejsDoc: "=",
        readOnly: "=",
        spellCheck: "=",
        spellCheckLanguage: "=",
        autoComplete: "=",
        autoCloseBrackets: "=",
        fontSize: "=",
        lineHeight: "=",
        docId: "=",
        onSave: "="
      },

      link(scope, element, attrs) {
        const bodyEl = element.find('.cm-editor-body');
        let editor = null;
        let cursorPositionManager = null;
        const autocompleteAdapter = new AutocompleteAdapter(
          scope,
          metadata,
          scope.$root._references
        );
        const keyBindingsAdapter = {
          triggerRecompile: scope.onSave,
          triggerSyncToPdf
        };

        // Name the scope to be editor. This means that events prefixed with
        // `editor:` will listened for by the rich text editor
        scope.name = 'editor';

        const init = function() {
          editor = new scope.bundle.Editor(
            bodyEl[0],
            new RichTextAdapter(ide.fileTreeManager),
            autocompleteAdapter,
            keyBindingsAdapter,
            getSetting
          );
          initCursorPosition();
          switchAttachment(scope.sharejsDoc);
          return setUpFormattingEventListeners();
        };

        var switchAttachment = function(sharejsDoc, oldSharejsDoc) {
          if (sharejsDoc === oldSharejsDoc) { return; }
          if (oldSharejsDoc != null) {
            scope.$broadcast('beforeChangeDocument');
            detachFromCM(oldSharejsDoc);
          }
          if (sharejsDoc != null) {
            attachToCM(sharejsDoc);
          }
          if ((sharejsDoc != null) && (oldSharejsDoc != null)) {
            return scope.$broadcast('afterChangeDocument');
          }
        };

        // If doc is changed, switch the CodeMirror/ShareJS attachment
        scope.$watch("sharejsDoc", switchAttachment);

        scope.$watch("readOnly", function(value) {
          if (value != null) {
            return editor.setReadOnly(value);
          }
        });

        var setUpFormattingEventListeners = function() {
          scope.formattingEvents.on('section', () => editor.wrapSection());
          scope.formattingEvents.on('subsection', () => editor.wrapSubsection());
          scope.formattingEvents.on('bold', () => editor.wrapBold());
          scope.formattingEvents.on('italic', () => editor.wrapItalic());
          scope.formattingEvents.on('inlineMath', () => editor.wrapInlineMath());
          scope.formattingEvents.on('displayMath', () => editor.wrapDisplayMath());
          scope.formattingEvents.on('numberedList', () => editor.wrapNumberedList());
          return scope.formattingEvents.on('bulletList', () => editor.wrapBulletList());
        };

        const tearDownFormattingEventListeners = function() {
          scope.formattingEvents.off('section');
          scope.formattingEvents.off('subsection');
          scope.formattingEvents.off('bold');
          scope.formattingEvents.off('italic');
          scope.formattingEvents.off('inlineMath');
          scope.formattingEvents.off('displayMath');
          scope.formattingEvents.off('numberedList');
          return scope.formattingEvents.off('bulletList');
        };

        // Trigger the event once *only* - this is called after CM is connected
        // to the ShareJs instance but this event should only be triggered the
        // first time the editor is opened. Not every time the docs opened
        const triggerEditorInitEvent = _.once(() => scope.$broadcast('editorInit'));

        var attachToCM = sharejsDoc =>
          scope.$applyAsync(function() {
            editor.openDoc(sharejsDoc.getSnapshot());
            sharejsDoc.attachToCM(editor.getCodeMirror());
            editor.enable();
            sharejsDoc.on("remoteop.richtext", () => editor.update());
            // Clear undo history so that attaching to ShareJS isn't included
            editor.getCodeMirror().clearHistory();
            triggerEditorInitEvent();
            initSpellCheck();
            return setUpMetadataEventListener();
          })
        ;

        var detachFromCM = function(sharejsDoc) {
          tearDownSpellCheck();
          tearDownMetadataEventListener();
          sharejsDoc.detachFromCM();
          return sharejsDoc.off("remoteop.richtext");
        };

        const handleChangeForSpellCheck = function(_, event) {
          return this.spellCheckManager.onChange(event);
        };

        var initSpellCheck = function() {
          const spellCheckCache = $cacheFactory.get(`spellCheck-${scope.name}`) ||
            $cacheFactory(`spellCheck-${scope.name}`, { capacity: 1000 });
          this.spellCheckManager = new SpellCheckManager(
            scope,
            spellCheckCache,
            $http,
            $q,
            new SpellCheckAdapter(editor)
          );
          this.spellCheckManager.init();
          const codeMirror = editor.getCodeMirror();
          codeMirror.on('change', handleChangeForSpellCheck);
          $(codeMirror.getWrapperElement()).on(
            'contextmenu',
            this.spellCheckManager.onContextMenu
          );
          return codeMirror.on('scroll', this.spellCheckManager.onScroll);
        };

        var tearDownSpellCheck = function() {
          const codeMirror = editor.getCodeMirror();
          codeMirror.off('change', handleChangeForSpellCheck);
          $(codeMirror.getWrapperElement()).off(
            'contextmenu',
            this.spellCheckManager.onContextMenu
          );
          return codeMirror.off('scroll', this.spellCheckManager.onScroll);
        };

        var initCursorPosition = function() {
          cursorPositionManager = new CursorPositionManager(
            scope,
            new CursorPositionAdapter(editor),
            localStorage
          );
          editor.getCodeMirror().on(
            'cursorActivity',
            cursorPositionManager.onCursorChange
          );
          return $(window).on('unload', cursorPositionManager.onUnload);
        };

        const tearDownCursorPosition = function() {
          editor.getCodeMirror().off(
            'cursorActivity',
            cursorPositionManager.onCursorChange
          );
          return $(window).off('unload', cursorPositionManager.onUnload);
        };

        var triggerSyncToPdf = () => cursorPositionManager.onSyncToPdf();

        var setUpMetadataEventListener = () => editor.getCodeMirror().on('change', autocompleteAdapter.onChange);

        var tearDownMetadataEventListener = () => editor.getCodeMirror().off('change', autocompleteAdapter.onChange);

        var getSetting = key => scope[key];

        scope.$on('$destroy', function() {
          scope.$broadcast('changeEditor');
          tearDownSpellCheck();
          tearDownCursorPosition();
          tearDownFormattingEventListeners();
          tearDownMetadataEventListener();
          detachFromCM(scope.sharejsDoc);
          return editor.disable();
        });

        init();

        if (attrs.resizeOn != null) {
          for (let event of Array.from(attrs.resizeOn.split(','))) {
            scope.$on(event, () => __guard__(editor != null ? editor.getCodeMirror() : undefined, x => x.refresh()));
          }
        }

        scope.$watch('fontSize', function(value) {
          bodyEl.css({ 'font-size': `${value}px` });
          return __guard__(editor != null ? editor.getCodeMirror() : undefined, x => x.refresh());
        });

        return scope.$watch("lineHeight", function(value) {
          let lineHeight;
          if (!value) { return; }
          switch (value) {
            case 'compact':
              lineHeight = 1.33;
              break;
            case 'normal':
              lineHeight = 1.6;
              break;
            case 'wide':
              lineHeight = 2;
              break;
            default:
              lineHeight = 1.6;
          }
          bodyEl.css({ 'line-height': lineHeight });
          return __guard__(editor != null ? editor.getCodeMirror() : undefined, x => x.refresh());
        });
      },

      template: `\
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
</div>\
`
    })
)
);

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}