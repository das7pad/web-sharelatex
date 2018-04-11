import CodeMirror, { Doc } from 'codemirror'

import LatexMode from './latex-mode/LatexMode'
import RichText from './rich-text/RichText'
import keyBindings from './key-bindings/KeyBindings'

let rt

export function init (rootEl, rtAdapter) {
  CodeMirror.defineMode('latex', () => new LatexMode())
  CodeMirror.defineMIME('application/x-tex', 'latex')
  CodeMirror.defineMIME('application/x-latex', 'latex')

  const cm = CodeMirror(rootEl, {
    mode: 'latex',
    lineWrapping: true,
    extraKeys: keyBindings
  })

  if (rt) rt.disable()
  rt = new RichText(cm, rtAdapter)

  return cm
}

export function openDoc (cm, content) {
  if (rt) rt.disable()

  const newDoc = Doc(content, 'latex')
  cm.swapDoc(newDoc)

  return newDoc
}

export function enableRichText () {
  rt.enable()
}
