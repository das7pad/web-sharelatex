import { Pos } from 'codemirror'

export default function autocomplete (cm, { autocompleteAdapter }) {
  const cursor = cm.getCursor()
  const token = cm.getTokenAt(cursor)

  return {
    list: autocompleteAdapter.getCompletions(handleCompletionPicked),
    from: Pos(cursor.line, token.start),
    to: Pos(cursor.line, token.end)
  }
}

function handleCompletionPicked (cm, autocomplete, completion) {
  // Strip tabstops
  const completionText = completion.text.replace(/\$[123]/g, '')

  cm.replaceRange(
    completionText,
    autocomplete.from,
    autocomplete.to,
    'complete' // Group completion events in undo history
  )

  const firstArg = completionText.match(/[{[]([\w \-_]*)[}\]]/)
  if (firstArg !== null) {
    const lineNo = autocomplete.from.line
    const startPos = {
      line: lineNo,
      ch: autocomplete.from.ch + firstArg.index + 1
    }
    const endPos = {
      line: lineNo,
      ch: startPos.ch + firstArg[1].length
    }
    cm.setSelection(startPos, endPos)
  }
}
