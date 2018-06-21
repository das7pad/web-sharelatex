/* global _ */

import { Pos } from 'codemirror'
import Fuse from 'fuse.js'

export default function autocomplete (cm, { autocompleteAdapter }) {
  const cursor = cm.getCursor()
  const token = cm.getTokenAt(cursor)

  // Ignore comments or strings
  if (/\b(?:string|comment)\b/.test(token.type)) return
  // Ignore if user removed characters
  if (!token.string.length) return

  const list = autocompleteAdapter.getCompletions(handleCompletionPicked)

  // Fuse seems to have a weird bug where if every item in the list matches
  // equally it picks an item further down the unsorted list, rather than the
  // first of the unsorted list.This appears like the completions are in a weird
  // order when the autocomplete is first opened
  // To work around this, check if the token is a single backslash and show only
  // the unsorted list
  if (token.string === '\\') {
    return {
      list,
      from: Pos(cursor.line, token.start),
      to: Pos(cursor.line, token.end)
    }
  } else {
    try {
      const fuzzySearch = makeFuzzySearch(list)

      return {
        list: fuzzySearch.search(token.string),
        from: Pos(cursor.line, token.start),
        to: Pos(cursor.line, token.end)
      }
    } catch (e) {
      if (e === 'Error: Pattern length is too long') {
        // do nothing
      } else {
        throw e
      }
    }
  }
}

function handleCompletionPicked (cm, autocomplete, completion) {
  // Strip tabstops
  let completionText = completion.text.replace(/\$[0-9]/g, '')

  // If completing \begin also insert \end
  if (isBeginCommand(completionText)) {
    const { line } = cm.getCursor()
    const [whitespace] = cm.getLine(line).match(/^\s*/)

    completionText = `${completionText}\n${whitespace}\n${whitespace}\\end{}`
  }

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

function isBeginCommand (completion) {
  return /^\\begin/.test(completion)
}

/*
 * Memoize building up Fuse fuzzy search as it is somewhat expensive
 */
const makeFuzzySearch = _.memoize((list) => {
  return new Fuse(list, {
    threshold: 0.3,
    keys: ['text']
  })
})
