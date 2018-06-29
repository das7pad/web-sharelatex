import CodeMirror, { Doc } from 'codemirror'
import 'codemirror/addon/hint/show-hint'

import LatexMode from './latex_mode/latex_mode'
import RichText from './rich_text/rich_text'
import {
  makeKeyBindings,
  makeKeyUpHandler,
  tearDownKeyUpHandler
} from './key_bindings/key_bindings'
import makeAutocomplete from './autocomplete/autocomplete'
import HighlightedWordManager from './spell_check/highlighted_word_manager'
import * as textWrapping from './key_bindings/text_wrapping'

export class Editor {
  constructor (rootEl, richTextAdapter, autocompleteAdapter, getSetting) {
    CodeMirror.defineMode('latex', () => new LatexMode())
    CodeMirror.defineMIME('application/x-tex', 'latex')
    CodeMirror.defineMIME('application/x-latex', 'latex')

    this.codeMirror = CodeMirror(rootEl, {
      mode: 'latex',
      lineNumbers: true,
      lineWrapping: true,
      extraKeys: makeKeyBindings(getSetting),
      hintOptions: {
        hint: makeAutocomplete(autocompleteAdapter, getSetting),
        completeSingle: false
      }
    })

    this.adapter = richTextAdapter
    this.autocompleteAdapter = autocompleteAdapter
    this.highlightedWordManager = new HighlightedWordManager(this.codeMirror)
    makeKeyUpHandler(this.codeMirror)
  }

  getCodeMirror () {
    return this.codeMirror
  }

  openDoc (content) {
    const newDoc = Doc(content, 'latex')
    this.codeMirror.swapDoc(newDoc)

    return newDoc
  }

  enable () {
    this.richText = new RichText(this.codeMirror, this.adapter)
    this.richText.enable()
  }

  disable () {
    this.richText.disable()
    tearDownKeyUpHandler(this.codeMirror)
  }

  update () {
    this.richText.update()
  }

  wrapBold () {
    textWrapping.wrapBold(this.codeMirror)
  }

  wrapItalic () {
    textWrapping.wrapItalic(this.codeMirror)
  }

  wrapSection () {
    textWrapping.wrapSection(this.codeMirror)
  }

  wrapSubsection () {
    textWrapping.wrapSubsection(this.codeMirror)
  }

  wrapInlineMath () {
    textWrapping.wrapInlineMath(this.codeMirror)
  }

  wrapDisplayMath () {
    textWrapping.wrapDisplayMath(this.codeMirror)
  }

  wrapNumberedList () {
    textWrapping.wrapNumberedList(this.codeMirror)
  }

  wrapBulletList () {
    textWrapping.wrapBulletList(this.codeMirror)
  }
}
