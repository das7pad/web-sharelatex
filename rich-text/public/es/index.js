import CodeMirror, { Doc } from 'codemirror'

import LatexMode from './latex_mode/latex_mode'
import RichText from './rich_text/rich_text'
import keyBindings from './key_bindings/key_bindings'

export { default as WordManager } from './spell_check/word_manager'

let richText

export function init (rootEl) {
  CodeMirror.defineMode('latex', () => new LatexMode())
  CodeMirror.defineMIME('application/x-tex', 'latex')
  CodeMirror.defineMIME('application/x-latex', 'latex')

  return CodeMirror(rootEl, {
    mode: 'latex',
    lineWrapping: true,
    extraKeys: keyBindings
  })
}

export function openDoc (codeMirror, content) {
  const newDoc = Doc(content, 'latex')
  codeMirror.swapDoc(newDoc)

  return newDoc
}

export function enableRichText (codeMirror, rtAdapter) {
  richText = new RichText(codeMirror, rtAdapter)
  richText.enable()
}

export function disableRichText () {
  richText.disable()
}

export function updateRichText () {
  richText.update()
}

export function updateSpellCheck (codeMirror, wordManager) {
  codeMirror.addOverlay({
    token (stream) {
      const { line: currentLine } = stream.lineOracle
      const highlightsForLine = wordManager.getHighlights()[currentLine]

      if (highlightsForLine && highlightsForLine.length) {
        for (let highlight of highlightsForLine) {
          if (stream.match(highlight.word)) {
            return 'spell-error'
          } else {
            stream.next()
            return null
          }
        }
      }

      stream.next()
      return null
    }
  })
}
