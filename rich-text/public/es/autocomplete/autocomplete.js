/* global _ */

import { Pos } from 'codemirror'
import Fuse from 'fuse.js'

import BIBTEX_COMMANDS from './bibtex_commands'

export default function makeAutocomplete (adapter, getSetting) {
  /**
   * Show autocomplete menu
   */
  function autocomplete (cm) {
    if (!getSetting('autoComplete')) return

    const cursor = cm.getCursor()
    const token = cm.getTokenAt(cursor)

    // Ignore comments or strings
    if (/\b(?:string|comment)\b/.test(token.type)) return

    // Adjust token to handle commas in \cite
    const distanceFromCursor = cursor.ch - token.start
    const prevComma = token.string.lastIndexOf(',', distanceFromCursor - 1) + 1
    const nextComma = token.string.indexOf(',', distanceFromCursor) + 1
    // If there is a comma after the cursor, adjust token end up to this comma
    if (nextComma) token.end = token.start + nextComma - 1
    // Adjust the token start to the comma before the cursor (no-op if there
    // isn't a cursor)
    token.start += prevComma
    // Slice the string so that only contains text between the cursors
    token.string = token.string.slice(
      prevComma,
      nextComma ? nextComma - 1 : undefined
    ).trim()

    const range = cm.getRange(
      Pos(cursor.line, cursor.ch - 1),
      Pos(cursor.line, cursor.ch + 1)
    )
    if (range === ' ' || range === '  ') {
      // If there is a space before or after the cursor then we need to prevent
      // looking back on the line for the previous command

      // Firstly we do this by marking the token as a command
      token.type = 'tag'
      // We also need to remove a backslash from the token string if typing a
      // backslash followed by a space
      token.string = ''
    } else if (token.string === '\\') {
      token.type = 'tag'
    }

    // If there is a previous command on the line, show argument completions.
    // Otherwise show command completions
    const prevCommand = getPrevCommandOnLine(cm, cursor.line, token)

    let list
    if (prevCommand) {
      list = getArgumentCompletions(prevCommand)
      // Cursor is inside an empty argument, so we adjust the token position
      // inside the argument and set to an empty string
      if (token.string === '{' || token.string === '[') {
        token.start = token.end
        token.string = ''
      }
    } else {
      if (token.string === '') return
      list = adapter.getCommandCompletions(handleCommandCompletionPicked)
    }

    // Fuse seems to have a weird bug where if every item in the list matches
    // equally it picks an item further down the unsorted list, rather than the
    // first of the unsorted list.This appears like the completions are in a
    // weird order when the autocomplete is first opened
    // To work around this, check if the token is a single backslash and show
    // only the unsorted list
    if (token.string === '\\' || token.string === '') {
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

  function getArgumentCompletions (command) {
    if (isBibtexCommand(command.string)) {
      return getBibtexArgumentCompletions()
    } else if (isReferenceCommand(command.string)) {
      return getReferenceArgumentCompletions()
    } else {
      return getCommandArgumentCompletions(command)
    }
  }

  function getBibtexArgumentCompletions () {
    const { keys: references } = adapter.getBibtexArguments()
    return references.map((ref) => {
      return {
        text: ref,
        displayText: ref
      }
    })
  }

  function getReferenceArgumentCompletions () {
    return adapter.getReferenceArguments().map((ref) => {
      return {
        text: ref,
        displayText: ref
      }
    })
  }

  function getCommandArgumentCompletions (command) {
    const argumentsForCommand = ARGUMENTS[command.string] || []
    return argumentsForCommand.map((arg) => {
      return {
        text: arg,
        displayText: arg,
        hint: handleArgumentCompletionPicked
      }
    })
  }

  function handleCommandCompletionPicked (cm, selection, completion) {
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
      selection.from,
      selection.to,
      'complete' // Group completion events in undo history
    )

    const firstArg = completionText.match(/[{[]([\w \-_]*)[}\]]/)
    if (firstArg !== null) {
      const lineNo = selection.from.line
      const startPos = {
        line: lineNo,
        ch: selection.from.ch + firstArg.index + 1
      }
      const endPos = {
        line: lineNo,
        ch: startPos.ch + firstArg[1].length
      }
      cm.setSelection(startPos, endPos)

      cm.showHint()
    }
  }

  function handleArgumentCompletionPicked (cm, selection, completion) {
    cm.replaceRange(
      completion.text,
      selection.from,
      selection.to,
      'complete' // Group completion events in undo history
    )

    const { line: lineNo } = selection.from
    const token = cm.getTokenAt(selection.from)
    const prevCommand = getPrevCommandOnLine(cm, lineNo, token)

    if (isBeginCommand(prevCommand.string)) {
      const oneLineBelow = cm.getLine(lineNo + 1) || ''
      const twoLinesBelow = cm.getLine(lineNo + 2) || ''

      // If the line 2 below the cursor contains \end{}, handle completing
      // environment
      const endIndex = twoLinesBelow.indexOf('\\end{}')
      if (endIndex !== -1) {
        // If completion is \begin{itemize} or \begin{enumerate} and the
        // environment is empty, insert \item into the environment
        if (
          (completion.text === 'itemize' || completion.text === 'enumerate') &&
          (/^\s+$/.test(oneLineBelow) || !oneLineBelow)
        ) {
          const whitespace = oneLineBelow.match(/^\s*/)
          cm.replaceRange(`${whitespace}\\item `, {
            line: lineNo + 1,
            ch: 0
          })
        }

        // Insert completion into \end{}
        cm.replaceRange(completion.text, {
          line: lineNo + 2,
          ch: endIndex + 5 // Argument is 5 chars from the beginning of \end{}
        })
      }

      // Move cursor into environment
      cm.setCursor({ line: lineNo + 1 })
    } else {
      cm.setCursor({ line: lineNo })
    }
  }

  function getPrevCommandOnLine (cm, line, token) {
    // While the token is not a command (marked as tags by parser), get the
    // previous token on the line
    let searchingToken = token
    while (searchingToken.type !== 'tag' && searchingToken.start > 0) {
      searchingToken = cm.getTokenAt(Pos(line, searchingToken.start))
    }

    // Return found token if it is a command and it is not the original token
    const isCommand = searchingToken.type === 'tag'
    const isDifferentToken = searchingToken !== token
    return isCommand && isDifferentToken ? searchingToken : null
  }

  function isBeginCommand (command) {
    return /^\\begin/.test(command)
  }

  function isBibtexCommand (command) {
    return BIBTEX_COMMANDS.indexOf(command) !== -1
  }

  function isReferenceCommand (command) {
    return (/^\\(eq|page|c|C)?ref/).test(command)
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

  const ARGUMENTS = {
    '\\begin': adapter.getBeginCommandArguments()
  }

  return autocomplete
}
