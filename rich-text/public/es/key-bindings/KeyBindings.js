/* global _ */

import CodeMirror from 'codemirror'

export default {
  'Backspace': function (cm) { return _handleBackspace(cm) },
  'Delete': function (cm) { return _handleDelete(cm) },
  'Up': function (cm) { return _handleUp(cm) },
  'Home': 'goLineLeftSmart',
  'End': 'goLineRight',
  'Cmd-Left': 'goLineLeftSmart'
}

// Defines the commands that should be on a single line,
// the enter, delete and backspace behaviors will be overridden in the
// respective handlers
var _COMMANDS_ON_SINGLE_LINE = {
  'chapter': true,
  'chapter\\*': true,
  'section': true,
  'section\\*': true,
  'subsection': true,
  'subsection\\*': true,
  'subsubsection': true,
  'subsubsection\\*': true
}

function _handleBackspace (cm) {
  var selection = cm.listSelections()[0]
  var isSelectionCursor = _.isEqual(selection.from(), selection.to())
  if (isSelectionCursor) {
    // Attempt to run special handling behaviour
    if (
      _handleBackspaceListEnvs(cm) ||
      _handleBackspaceAbstract(cm) ||
      _handleBackspaceCommandsSingleLine(cm)
    ) {
      // Functionality was handled, don't run default behaviour
      return null
    }
  }

  deleteClosingCharForSelection(cm)
  return CodeMirror.Pass // Run default behaviour
}

function _handleDelete (cm) {
  // Attempt to run special handling behaviour
  if (
    _handleDeleteListEnvs(cm) ||
    _handleDeleteCommandsSingleLine(cm) ||
    _handleDeleteAbstract(cm)
  ) {
    // Functionality was handled, don't run default behaviour
    return null
  }

  // Special handling wasn't run, do default behaviour
  return CodeMirror.Pass
}

function _handleUp (cm) {
  var cursor = cm.getCursor()
  var state = cm.getTokenAt(cursor, true).state
  var lastMark = _.last(state.marks)

  // The last mark the cursor is on a line with an \item or \enumerate-item
  if (
    lastMark &&
    (
      lastMark.kind === 'item' ||
      lastMark.kind === 'enumerate-item'
    )
  ) {
    // And the cursor is at the end of the line
    if (cursor.ch === lastMark.to.ch) {
      // Jump to the beginning of the line and prevent the default behaviour
      // (moving the cursor up). In RT mode this moves the cursor to the
      // beginning of the line above
      // The "exception" is if the line above is an \item, because then the
      // cursor will be at the beginning of the \item for the current line,
      // and RT will render this cursor at the end of the line above
      // TODO: does this behaviour make sense?
      cm.execCommand('goLineLeft')
      return null
    }
  }

  return CodeMirror.Pass
}

// Helper function to handle the backspace command in list environments
function _handleBackspaceListEnvs (cm) {
  // Given a closedMark, it will check that the content inside
  // does not contain any spaces or item commands
  function _isListEnvEmpty (closedMark) {
    return cm.getRange(closedMark.contentFrom, closedMark.contentTo)
      .replace(/\s*/g, '').replace(/\\item$/, '') === ''
  }

  var currentPos = cm.doc.getCursor()
  var token = cm.getTokenAt(currentPos, true)
  var lastOpenMark = _.last(token.state.openMarks)
  var lastClosedMark = _.last(token.state.marks)
  var line = cm.getLine(currentPos.line)
  // If we are inside a list environment
  if (
    lastOpenMark &&
    (lastOpenMark.kind === 'itemize' || lastOpenMark.kind === 'enumerate')
  ) {
    // And the position of the cursor is at the line after where the content
    // starts and at position 6 (after \\item) - i.e. at beginning of first
    // \item
    if (
      currentPos.line === lastOpenMark.contentFrom.line + 1 &&
      currentPos.ch === 6
    ) {
      // Lookahead to find the closing \end{..} for the current env using the
      // state at the end of the document
      var closedEnvironment = _.find(
        cm.getStateAfter(cm.doc.lineCount(), true).marks,
        function (m) {
          return (m.kind === 'itemize' || m.kind === 'enumerate') &&
            m.from.line === lastOpenMark.from.line &&
            m.from.ch === lastOpenMark.from.ch
        })
      // If the environment is empty
      if (_isListEnvEmpty(closedEnvironment)) {
        // we remove the entire environment
        cm.replaceRange('', closedEnvironment.from, closedEnvironment.to)
      } else {
        // There are still items in the list, so we need to move the current
        // \item outside of the env. To do this, we need to fire up an
        // operation in CM
        cm.operation(function () {
          // Retrieve the text for the line above the \begin{..}
          var lineBefore = cm.getLine(currentPos.line - 2)
          // Get text from where cursor is to the end of the line
          var lineRange = cm.getRange(
            currentPos,
            { line: currentPos.line, ch: line.length }
          )
          // If the lineBefore the env is a closing env command
          if (lineBefore && lineBefore.match(/\\end{.*}/)) {
            // The line above the \begin{..} is a closing env
            // Move text for the current \item out of the env and remove the
            // old \item line

            // Insert the text after \item at the beginning of the line above
            // and insert a newline after
            cm.replaceRange(
              lineRange + '\n',
              { line: currentPos.line - 1, ch: 0 }
            )
            // Remove the current \item (line + 1 because we just added a
            // newline)
            // TODO: I think this can be removed - we are deleting the whole
            // line below
            cm.replaceRange(
              '',
              { line: currentPos.line + 1, ch: 0 },
              { line: currentPos.line + 1, ch: line.length }
            )
            // Remove the newline for the current \item
            cm.replaceRange(
              '',
              { line: currentPos.line + 1, ch: 0 },
              { line: currentPos.line + 2, ch: 0 }
            )

            // Delete the environment if it's empty
            if (_isListEnvEmpty(closedEnvironment)) {
              cm.replaceRange(
                '',
                closedEnvironment.from,
                closedEnvironment.to
              )
            }
            // Place the cursor at the beginning of the text that we moved out
            // of the env
            _.delay(function () {
              cm.setCursor({ line: currentPos.line - 1, ch: 0 })
            }, 20)
          } else {
            if (lineBefore) {
              // There is something on the line above the \begin{..}, but it
              // is not a closing env
              // Move text for the current \item out of the env and append to
              // the line above the \begin{..}

              var beforeLength = lineBefore.length
              // append the text of the current \item to the line above the
              // \begin{..}
              cm.replaceRange(
                lineRange,
                { line: currentPos.line - 2, ch: beforeLength }
              )

              // Remove the current \item and it's text (now that we've moved
              // it)
              cm.replaceRange(
                '',
                { line: currentPos.line, ch: 0 },
                { line: currentPos.line, ch: line.length }
              )

              // Delete the environment if it's empty
              if (_isListEnvEmpty(closedEnvironment)) {
                cm.replaceRange(
                  '',
                  closedEnvironment.from,
                  closedEnvironment.to
                )
              }

              // Remove the current line (now that we've removed the \item)
              cm.execCommand('deleteLine')

              // Place the cursor at the beginning of the text that we moved
              // out of the env
              cm.setCursor({ line: currentPos.line - 2, ch: beforeLength })
            } else {
              // There is nothing on the line above the \begin{..}
              // Move text for the current \item out of the env and put on
              // line above the \begin{..}

              // append the text of the current \item to to the line above the
              // \begin{..}
              cm.replaceRange(
                lineRange + '\n',
                { line: currentPos.line - 1, ch: 0 }
              )

              // Delete the environment if it's empty
              if (_isListEnvEmpty(closedEnvironment)) {
                cm.replaceRange(
                  '',
                  closedEnvironment.from,
                  closedEnvironment.to
                )
              }

              // Remove everything on the current line (now that we've removed
              // the \item)
              cm.replaceRange(
                '',
                { line: currentPos.line + 1, ch: 0 },
                { line: currentPos.line + 2, ch: 0 }
              )

              // Place the cursor at the beginning of the text that we moved
              // of the env
              _.delay(function () {
                cm.setCursor({ line: currentPos.line - 1, ch: 0 })
              }, 20)

              cm.refresh()
            }
          }
          // TODO: the branches here do very similar things but are
          // inconsistent in how they do it. Can we make them consistent/
          // reduce the number of branches
        })
      }
      // We handled the text manipulation, so return true to prevent the
      // default backspace action
      return true
    } else {
      // The cursor is within an env, but not at the beginning of the first
      // \item

      // Attempt to find a closed list environment on the line above the
      // current line - this would be closing a nested list env
      var closedEnvLineBefore = _.find(
        token.state.marks,
        function (m) {
          return (m.kind === 'itemize' || m.kind === 'enumerate') &&
            m.to.line === currentPos.line - 1
        }
      )

      // If there is a nested list env on the line above the cursor

      // TODO: the second conditional here is confusing. And potentially
      // unnecessary? Because closedEnvLineBefore won't exist unless the
      // second conditional is true?
      if (
        closedEnvLineBefore &&
        currentPos.line === closedEnvLineBefore.to.line + 1
      ) {
        // If the closed env is empty
        if (_isListEnvEmpty(closedEnvLineBefore)) {
          // We remove the entire env
          cm.replaceRange(
            '',
            closedEnvLineBefore.from,
            closedEnvLineBefore.to
          )
          // We have handled the text manipulation, so return true to prevent
          // the default backspace action
          return true
        } else if (currentPos.ch === 6) {
          // If the cursor is after a \item
          cm.operation(function () {
            // Get the length of the line above the \end{..}
            var lineBeforeLength = cm.getLine(currentPos.line - 2).length
            // Get the text from the cursor to the end of the current line
            // (i.e.) after the \item
            var lineRange = cm.getRange(currentPos, {
              line: currentPos.line,
              ch: line.length
            })

            // Append the text on the line above the \end{..}
            cm.replaceRange(
              lineRange,
              { line: currentPos.line - 2, ch: lineBeforeLength }
            )

            // Remove everything on the current line (i.e. the \item), now
            // that we've moved the text
            cm.replaceRange(
              '',
              { line: currentPos.line, ch: 0 },
              { line: currentPos.line, ch: line.length }
            )

            if (_isListEnvEmpty(closedEnvLineBefore)) {
              cm.replaceRange(
                '',
                closedEnvLineBefore.from,
                closedEnvLineBefore.to
              )
            }

            // Remove the whole line
            cm.replaceRange(
              '',
              { line: currentPos.line, ch: 0 },
              { line: currentPos.line + 1, ch: 0 }
            )

            // Place the cursor at the beginning of the text that we just
            // moved
            cm.setCursor({ line: currentPos.line - 2, ch: lineBeforeLength })
          })
          // We handled the text manipulation, so return true to prevent the
          // default backspace action
          return true
        }
      }
    }
  } else if ( // We are not inside a list env, but if the last token is a list
    lastClosedMark &&
    (lastClosedMark.kind === 'itemize' || lastClosedMark.kind === 'enumerate')
  ) {
    // If at the begining of the line immediately after the list
    if (
      currentPos.line === lastClosedMark.to.line + 1 &&
      currentPos.ch === 0
    ) {
      cm.operation(function () {
        // delete the line if it's blank
        if (line === '') {
          cm.execCommand('deleteLine')
        }
        // skip and move the cursor at the end of the text of the list above
        cm.setCursor(lastClosedMark.contentTo)
      })
      return true
    }
  }
}

function _handleDeleteListEnvs (cm) {
  var currentPos = cm.doc.getCursor()
  var token = cm.getTokenAt(currentPos, true)
  var lastOpenMark = _.last(token.state.openMarks)
  var lineCursor = cm.getLine(currentPos.line)
  var lineAfterCursor = cm.getLine(currentPos.line + 1)

  // If the cursor is at the end of the document, return false to run the
  // default delete key behaviour
  if (!lineAfterCursor) return false

  // If within a list environment
  if (
    lastOpenMark &&
    (lastOpenMark.kind === 'enumerate' || lastOpenMark.kind === 'itemize')
  ) {
    // If the cursor is at the end of the line
    if (currentPos.ch === lineCursor.length) {
      // If the line below the cursor contains a \begin{..} (i.e. a nested
      // list env) or an \end{..} (i.e. closing the list env)
      if (
        lineAfterCursor.match(/\\begin{.*}/) ||
        lineAfterCursor.match(/\\end{.*}/)
      ) {
        // Return true to prevent the default delete key behaviour
        // This prevents bringing the \end (nested \begin) up to the current
        // line, so that it reads nicer as a list
        return true
      }
    }
    // If the line below the cursor is opening a list env
  } else if (lineAfterCursor.match(/\\begin{(enumerate|itemize)}/)) {
    // if the cursor is at the end of the line
    if (currentPos.ch === lineCursor.length) {
      // Return true to prevent the default delete key behaviour
      // This prevents bringing the \end (nested \begin) up to the current
      // line, so that it reads nicer as a list
      return true
    }
  }
}

function _handleBackspaceAbstract (cm) {
  var currentPos = cm.doc.getCursor()
  var token = cm.getTokenAt(currentPos, true)
  var lastOpenMark = _.last(token.state.openMarks)
  var lastClosedMark = _.last(token.state.marks)
  var line = cm.getLine(currentPos.line)

  // If the cursor is inside an abstract env
  if (lastOpenMark && lastOpenMark.kind === 'abstract') {
    // If cursor is at the beginning of the first line of the env
    // Or at the end of the \begin{abstract} line
    if (
      (
        currentPos.ch === 0 &&
        currentPos.line === lastOpenMark.contentFrom.line + 1
      ) ||
      _.isEqual(currentPos, lastOpenMark.contentFrom)
    ) {
      // Look through all marks to find the closed abstract mark (open marks
      // don't have a to object)
      var closedMark = _.find(
        cm.getStateAfter(cm.doc.lineCount(), true).marks,
        function (m) {
          return m.kind === 'abstract' &&
            m.from.line === lastOpenMark.from.line &&
            m.from.ch === lastOpenMark.from.ch
        }
      )

      var closedMarkContent = cm.getRange(
        closedMark.contentFrom,
        closedMark.contentTo
      )
      if (closedMarkContent.replace(/\s*/, '') === '') {
        // If the abstract env is empty, remove it entirely
        cm.replaceRange('', closedMark.from, closedMark.to)
        // We handled the text manipulation, so return true to prevent the
        // default backspace action
        return true
      } else {
        // If there is text within the abstract env, move the cursor above the
        // \begin{..} to the end of that line
        cm.setCursor({
          line: currentPos.line - 2,
          ch: cm.getLine(currentPos.line - 2).length
        })
        // We handled the text manipulation, so return true to prevent the
        // default backspace action
        return true
      }
    }
  } else if (lastClosedMark && lastClosedMark.kind === 'abstract') {
    // If the last closed mark above the cursor is an abstract env

    // The cursor is on the line below the abstract env and at the beginning
    // of the line
    if (
      currentPos.line === lastClosedMark.to.line + 1 &&
      currentPos.ch === 0
    ) {
      cm.operation(function () {
        // delete the line if it's blank
        if (line === '') {
          cm.execCommand('deleteLine')
        }
        // Move the cursor at the end of the content of the abstract
        // env
        cm.setCursor(lastClosedMark.contentTo)
      })
      // We handled the text manipulation, so return true to prevent the
      // default backspace action
      return true
    }
  }
}

function _handleDeleteAbstract (cm) {
  var currentPos = cm.doc.getCursor()
  var token = cm.getTokenAt(currentPos, true)
  var lastOpenMark = _.last(token.state.openMarks)
  var line = cm.getLine(currentPos.line)

  var openAbstractAfter = (function () {
    var lineAfter = cm.getLine(currentPos.line + 1)
    if (!lineAfter) return

    // Find the token for the end of the line below the cursor
    var token = cm.getTokenAt({
      line: currentPos.line + 1,
      ch: lineAfter.length
    }, true)

    // Find the first open abstract env on the line below
    return _.find(token.state.openMarks, function (m) {
      return m.kind === 'abstract' && m.from.line === currentPos.line + 1
    })
  })()

  // If within an abstract environment
  if (lastOpenMark && lastOpenMark.kind === 'abstract') {
    if (
      // If the cursor is at the beginning of the line below the abstract
      // env's \begin{..}
      (
        currentPos.ch === 0 &&
        currentPos.line === lastOpenMark.contentFrom.line + 1
      ) ||
      // Or if cursor is immediately after the closing curly brace of the
      // \begin{..}
      _.isEqual(currentPos, lastOpenMark.contentFrom)
    ) {
      // Look through all marks to find the closed abstract mark (open marks
      // don't have a to object)
      var closedMark = _.find(
        cm.getStateAfter(cm.doc.lineCount(), true).marks,
        function (m) {
          return m.kind === 'abstract' &&
            m.from.line === lastOpenMark.from.line &&
            m.from.ch === lastOpenMark.from.ch
        }
      )

      var closedMarkContent = cm.getRange(
        closedMark.contentFrom,
        closedMark.contentTo
      )
      if (closedMarkContent.replace(/\s*/, '') === '') {
        // If the closed abstract has no content, then remove the entire env
        cm.replaceRange('', closedMark.from, closedMark.to)
        // We handled the text manipulation, so return true to prevent the
        // default backspace action
        return true
      }
    }
    // If the line below is within an abstract
  } else if (openAbstractAfter) {
    // If the cursor is at the end of the line
    if (currentPos.ch === line.length) {
      cm.operation(function () {
        // Remove the entire line if it is blank
        if (line === '') {
          cm.execCommand('deleteLine')
        }
        // Move the cursor to the start of the abstract
        // This makes sense within the context of RT as the \begin{..} cannot
        // be seen. So pressing delete should jump to content within the
        // abstract env
        cm.setCursor(openAbstractAfter.contentFrom)
      })
      // We handled the text manipulation, so return true to prevent the
      // default backspace action
      return true
    }
  }
}

/**
   * Handle backspace for commands with argument lookaheads
   * TODO: Rename this to just "section". The overly generic name isn't really
   * helping imo
   */
function _handleBackspaceCommandsSingleLine (cm) {
  var currentPos = cm.doc.getCursor()
  var token = cm.getTokenAt(currentPos, true)
  var lastOpenMark = _.last(token.state.openMarks)
  var lastClosedMark = _.last(token.state.marks)
  var line = cm.getLine(currentPos.line)

  // If we are inside a section command, and the section is at the start of
  // the current line
  if (
    lastOpenMark &&
    _COMMANDS_ON_SINGLE_LINE[lastOpenMark.kind]
  ) {
    // Check if current line has an empty section mark (i.e. there's no title
    // between the curly braces)
    var emptyMatch = line.match(
      new RegExp('\\\\' + lastOpenMark.kind + '\\s*{}')
    )

    // If the command is empty, we should delete the entire section
    if (emptyMatch) {
      cm.replaceRange(
        '',
        { line: currentPos.line, ch: lastOpenMark.from.ch },
        {
          line: currentPos.line,
          ch: lastOpenMark.from.ch + emptyMatch[0].length
        }
      )
      // We handled the text manipulation, so return true to prevent the
      // default backspace action
      return true
    }

    // If the cursor is at the start of the content of the section
    if (
      lastOpenMark.contentFrom.line === currentPos.line &&
      lastOpenMark.contentFrom.ch === currentPos.ch
    ) {
      // If the section command is at the start of the line
      if (lastOpenMark.from.ch === 0) {
        if (!cm.getLine(currentPos.line - 1)) {
          // If the line above is empty

          // Move the cursor to the end of the line above
          cm.setCursor({ line: lastOpenMark.from.line - 1 })
          cm.execCommand('goLineEnd')

          // Remove the section command entirely
          cm.replaceRange('', cm.getCursor(), lastOpenMark.from)
        } else {
          // If the line above the section command is not empty, just move the
          // cursor up to the end of that line
          cm.setCursor({ line: lastOpenMark.from.line - 1 })
          cm.execCommand('goLineEnd')
        }
      } else {
        // If there is some content before the section command

        // Delete the characters before the section command
        // This makes sense in the context of RT as you can't see the \section
        // command, so those chars are "before" the cursor
        cm.replaceRange(
          '',
          { line: currentPos.line, ch: lastOpenMark.from.ch - 1 },
          { line: currentPos.line, ch: lastOpenMark.from.ch }
        )
      }
      // We handled the text manipulation, so return true to prevent the
      // default backspace action
      return true
    }
    // If the last closed mark above the current line is a section
  } else if (
    lastClosedMark &&
    _COMMANDS_ON_SINGLE_LINE[lastClosedMark.kind]
  ) {
    if (
      (
        // If the cursor are at the end of the section command
        lastClosedMark.to.line === currentPos.line &&
        lastClosedMark.to.ch === currentPos.ch
      ) ||
      (
        // Or the the cursor is at the beginning of the line after the section
        // command
        currentPos.line === lastClosedMark.to.line + 1 &&
        currentPos.ch === 0
      )
    ) {
      // delete the line if it's blank
      if (line === '') {
        cm.execCommand('deleteLine')
      }
      // Move the cursor to the end of the content of the section command
      // (i.e.) before the }
      cm.setCursor(lastClosedMark.contentTo)

      // We handled the text manipulation, so return true to prevent the
      // default backspace action
      return true
    }
  }
}

// TODO: Rename this to just "section". The overly generic name isn't
// really helping imo
function _handleDeleteCommandsSingleLine (cm) {
  var currentPos = cm.doc.getCursor()
  var token = cm.getTokenAt(currentPos, true)
  var lastOpenMark = _.last(token.state.openMarks)
  var line = cm.getLine(currentPos.line)

  var marksAfter = filterMarksInRange(
    cm,
    { line: currentPos.line + 1, ch: 0 },
    'EOL'
  )
  var marksEol = filterMarksInRange(
    cm,
    { line: currentPos.line, ch: 0 },
    'EOL'
  )

  // TODO: I'm not exactly sure that this comment is correct. But the
  // intention of the code is not clear to me
  // Find the first section command mark on the lines on the current line or
  // below the current line
  var cmdSingleLineAfter = _.find(
    _.union(marksAfter, marksEol),
    function (m) {
      return _COMMANDS_ON_SINGLE_LINE[m.kind]
    }
  )

  // If we are inside a section command, and the section is at the start of
  // the current line
  if (lastOpenMark && _COMMANDS_ON_SINGLE_LINE[lastOpenMark.kind]) {
    // Check if current line has an empty section mark (i.e. there's no title
    // between the curly braces)
    var emptyMatch = line.match(
      new RegExp('\\\\' + lastOpenMark.kind + '\\s*{}')
    )
    if (emptyMatch) {
      // If the section is empty, remove the entire section
      cm.replaceRange(
        '',
        { line: currentPos.line, ch: lastOpenMark.from.ch },
        {
          line: currentPos.line,
          ch: lastOpenMark.from.ch + emptyMatch[2].length
        }
      )
      // We handled the text manipulation, so return true to prevent the
      // default backspace action
      return true
      // If there is a section command on the current line and the cursor is
      // at the end of the content (i.e. just before the closing curly brace)
    } else if (
      cmdSingleLineAfter &&
      currentPos.ch === cmdSingleLineAfter.contentTo.ch
    ) {
      // We handled the text manipulation, so return true to prevent the
      // default backspace action
      return true
    }
    // If the cursor is at the end of the line
  } else if (currentPos.ch === line.length) {
    // And there are section commands below the current line
    if (marksAfter) {
      if (cmdSingleLineAfter) {
        // If the current line is empty, then remove it
        if (line === '') {
          cm.replaceRange(
            '',
            currentPos,
            { line: currentPos.line + 1, ch: 0 }
          )
        }
        // We handled the text manipulation, so return true to prevent the
        // default backspace action
        return true
      }
    }
  }
}

/**
 * remove an auto-closing pair of chars
 */
function deleteClosingCharForSelection (cm) {
  function deleteClosingChar (pos) {
    // Get the current cursor position and the chars before & after
    var deletingPos = CodeMirror.Pos(pos.line, pos.ch - 1)
    var nextPos = CodeMirror.Pos(pos.line, pos.ch + 1)

    var deletingChar = cm.getRange(deletingPos, pos)
    var nextChar = cm.getRange(pos, nextPos)

    var openingChars = ['{', '[', '(', '`']
    var closingChars = ['}', ']', ')', "'"]
    // Determine if deleting char is an specially handled opening char
    var isDeletingCharAnOpeningChar = openingChars.indexOf(deletingChar) >= 0
    // Determine if deleting char and next char "match" i.e. they are a pair
    // of opening and closing chars like { and }
    var doCharsMatch =
      openingChars.indexOf(deletingChar) === closingChars.indexOf(nextChar)

    if (isDeletingCharAnOpeningChar && doCharsMatch) {
      cm.replaceRange('', pos, nextPos)
    }
  }

  // TODO: I guess we don't worry about thi
  // if (inVimNonInsertMode() || _autoCloseBrackets === "0") {
  //   return CodeMirror.Pass
  // }

  if (cm.somethingSelected()) {
    return CodeMirror.Pass
  }

  // For each cursor, delete the closing char
  // Note: this is done in reverse order because deleting characters affects
  // subsequent cursor positions
  cm.listSelections().reverse().forEach(function (selection) {
    // Because we pass if something is selected (i.e. multiple chars are
    // selected from a single cursor), we know that from() & to() are the same
    var pos = selection.from()
    deleteClosingChar(pos)
  })

  return CodeMirror.Pass
}

function filterMarksInRange (cm, from, to) {
  if (from.line > cm.lastLine()) return []

  if (to === 'EOL') {
    var line = cm.getLine(from.line)
    to = { line: from.line, ch: line.length }
  }
  return _.filter(cm.getTokenAt(to).state.marks, function (m) {
    return (
      m.from.line >= from.line &&
      m.from.ch >= from.ch &&
      m.to.line <= to.line &&
      m.to.ch <= to.ch
    )
  })
}
