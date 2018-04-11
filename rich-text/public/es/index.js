import CodeMirror, { Doc } from 'codemirror'

import LatexMode from './latex-mode/LatexMode'
import RichText from './rich-text/RichText'
import keyBindings from './key-bindings/KeyBindings'

let richText

export function init (rootEl, rtAdapter) {
  CodeMirror.defineMode('latex', () => new LatexMode())
  CodeMirror.defineMIME('application/x-tex', 'latex')
  CodeMirror.defineMIME('application/x-latex', 'latex')

  const codeMirror = CodeMirror(rootEl, {
    mode: 'latex',
    lineWrapping: true,
    extraKeys: keyBindings
  })

  richText = new RichText(codeMirror, rtAdapter)

  return codeMirror
}

export function openDoc (codeMirror, content) {
  const newDoc = Doc(content, 'latex')
  codeMirror.swapDoc(newDoc)

  return newDoc
}

export function enableRichText () {
  richText.enable()
}

export function disableRichText () {
  richText.disable()
}

export function updateRichText () {
  richText.update()
}
