import CodeMirror, { Doc } from 'codemirror'

import LatexMode from './latex_mode/latex_mode'
import RichText from './rich_text/rich_text'
import makeKeyBindings from './key_bindings/key_bindings'
import HighlightedWordManager from './spell_check/highlighted_word_manager'
import * as textWrapping from './key_bindings/text_wrapping'

export class Editor {
  constructor (rootEl, adapter, getSetting) {
    CodeMirror.defineMode('latex', () => new LatexMode())
    CodeMirror.defineMIME('application/x-tex', 'latex')
    CodeMirror.defineMIME('application/x-latex', 'latex')

    this.codeMirror = CodeMirror(rootEl, {
      mode: 'latex',
      lineWrapping: true,
      extraKeys: makeKeyBindings(getSetting)
    })
    this.adapter = adapter
    this.highlightedWordManager = new HighlightedWordManager(this.codeMirror)
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
