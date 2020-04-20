import CodeMirror from 'codemirror'

import { mac } from '../utils/browser'
import { wrapBold, wrapItalic } from './text_wrapping'
import BIBTEX_COMMANDS from '../autocomplete/bibtex_commands'

const modifierKey = mac ? 'Cmd' : 'Ctrl'

const BACKSLASH_KEY = 220
const BACKSPACE_KEY = 8
const SPACE_KEY = 32
const COMMA_KEY = 188

export function makeKeyBindings(getSetting, keyBindingsAdapter) {
  // Override CM save command to be a no-op. No sense in bringing up the
  // browser's save dialog
  CodeMirror.commands.save = function () {}

  return Object.assign(
    {},
    {
      Backspace: handleBackspace,
      Delete: handleDelete,
      Up: handleUp,
      Enter: handleEnter,
      Home: 'goLineLeftSmart',
      End: 'goLineRight',
      'Cmd-Left': 'goLineLeftSmart',
      [`${modifierKey}-B`]: wrapBold,
      [`${modifierKey}-I`]: wrapItalic,
      [`${modifierKey}-/`]: 'toggleComment',
      [`${modifierKey}-F`]: 'findPersistent',
      [`${modifierKey}-G`]: 'findPersistentNext',
      [`Shift-${modifierKey}-G`]: 'findPersistentPrev',
      'Ctrl-Space': 'autocomplete',
      'Ctrl-,': keyBindingsAdapter.triggerSyncToPdf,
      'Ctrl-.': keyBindingsAdapter.triggerRecompile,
      [`${modifierKey}-Enter`]: keyBindingsAdapter.triggerRecompile
    },
    makeAutoCloseCharHandlers(getSetting)
  )
}

function makeAutoCloseCharHandlers(getSetting) {
  const autoCloseChars = {
    "'{'": { openChar: '{', closeChar: '}', typedChar: '{' },
    "'['": { openChar: '[', closeChar: ']', typedChar: '[' },
    "'}'": { openChar: '{', closeChar: '}', typedChar: '}' },
    "']'": { openChar: '[', closeChar: ']', typedChar: ']' },
    "'`'": { openChar: '`', closeChar: "'", typedChar: '`' },
    "'''": { openChar: '`', closeChar: "'", typedChar: "'" }
  }

  return Object.keys(autoCloseChars).reduce((acc, key) => {
    const { openChar, closeChar, typedChar } = autoCloseChars[key]
    acc[key] = function (cm) {
      return autoCloseChar(cm, getSetting, openChar, closeChar, typedChar)
    }
    return acc
  }, {})
}

export function makeKeyUpHandler(cm) {
  cm.on('keyup', handleKeyUp)
}

export function tearDownKeyUpHandler(cm) {
  cm.off('keyup', handleKeyUp)
}

// Defines the commands that should be on a single line,
// the enter, delete and backspace behaviors will be overridden in the
// respective handlers
var COMMANDS_ON_SINGLE_LINE = {
  chapter: true,
  'chapter\\*': true,
  section: true,
  'section\\*': true,
  subsection: true,
  'subsection\\*': true,
  subsubsection: true,
  'subsubsection\\*': true
}

function handleBackspace(cm) {
  var selection = cm.listSelections()[0]
  var isSelectionCursor = _.isEqual(selection.from(), selection.to())
  if (isSelectionCursor) {
    // Attempt to run special handling behaviour
    if (
      handleBackspaceListEnvs(cm) ||
      handleBackspaceAbstract(cm) ||
      handleBackspaceCommandsSingleLine(cm)
    ) {
      // Functionality was handled, don't run default behaviour
      return null
    }
  }

  deleteClosingCharForSelection(cm)
  return CodeMirror.Pass // Run default behaviour
}

function handleDelete(cm) {
  // Attempt to run special handling behaviour
  if (
    handleDeleteListEnvs(cm) ||
    handleDeleteCommandsSingleLine(cm) ||
    handleDeleteAbstract(cm)
  ) {
    // Functionality was handled, don't run default behaviour
    return null
  }

  // Special handling wasn't run, do default behaviour
  return CodeMirror.Pass
}

function handleUp(cm) {
  var cursor = cm.getCursor()
  var state = cm.getTokenAt(cursor, true).state
  var lastMark = _.last(state.marks)

  // The last mark the cursor is on a line with an \item or \enumerate-item
  if (
    lastMark &&
    (lastMark.kind === 'item' || lastMark.kind === 'enumerate-item')
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

function handleEnter(cm) {
  var cursor = cm.getCursor()
  var token = cm.getTokenAt(cursor, true)
  var currentState = token.state
  var lastOpenMark = _.last(currentState.openMarks)
  var lastClosedMark = _.last(currentState.marks)

  // If cursor is within an environment
  if (lastOpenMark) {
    // Get the parse state at the end of the line. Note this is different to
    // the state at the cursor (because the cursor may not be at the end of the
    // line)
    var stateLineAfter = cm.getStateAfter(cursor.line, true)
    var lastClosedMarkAfter = _.last(stateLineAfter.marks)
    var lastOpenMarkAfter = _.last(stateLineAfter.openMarks)

    // Handle enter command for itemize and enumerate
    // If within an itemize or enumerate environment and after a \item and
    // the cursor is on the same line as or after the \begin{...}
    if (
      (lastOpenMark.kind === 'itemize' || lastOpenMark.kind === 'enumerate') &&
      lastClosedMark &&
      cursor.line >= lastClosedMark.to.line
    ) {
      // If the cursor is within the \begin{...} argument
      if (
        cursor.line === lastOpenMark.from.line &&
        cursor.ch < lastOpenMark.contentFrom.ch
      ) {
        // Run the default Enter key handler
        return CodeMirror.Pass
      }

      // If the cursor is at the start of line
      if (cursor.ch === 0) {
        // If the line the cursor is on contains a \item
        if (cm.getLine(cursor.line).indexOf('\\item') === 0) {
          // Run the default Enter key handler
          return CodeMirror.Pass
        }
      }

      // If the cursor is on the same line of \end{...} and inside the mark
      if (
        lastClosedMarkAfter &&
        lastClosedMarkAfter.kind === lastOpenMark.kind &&
        cursor.line === lastClosedMarkAfter.to.line &&
        _.isEqual(lastOpenMark.from, lastClosedMarkAfter.from) &&
        cursor.ch < lastClosedMarkAfter.to.ch
      ) {
        // Run the default Enter key handler
        return CodeMirror.Pass
      }

      // If the cursor is still on the same line of \begin{...}
      if (
        cursor.line === lastOpenMark.from.line ||
        cursor.line === lastOpenMarkAfter.from.line
      ) {
        // If the cursor is before the end of the \begin{...} argument
        // TODO: is this handled above? (line 129)
        if (cursor.ch < lastOpenMark.contentFrom.ch) {
          // Run the default Enter key handler
          return CodeMirror.Pass
        }

        // Get the state at the end of the line below the cursor
        var stateAfter = cm.getStateAfter(cursor.line + 1, true)
        // Determine if the line below the cursor is an \item or \end{...}
        var check = _.find(stateAfter.marks, function (m) {
          return (
            m.from.line >= cursor.line &&
            (m.kind === 'enumerate-item' ||
              m.kind === 'item' ||
              m.kind === lastOpenMark.kind)
          )
        })

        // If there is no \item or \end{...} on the line below the cursor, we
        // should not autocomplete
        if (!check) {
          // Run the default Enter key handler
          return CodeMirror.Pass
        } else {
          // If there is an \item or \end{...}, insert a newline and \item on
          // the cursor
          cm.replaceRange('\n\\item ', {
            line: cursor.line,
            ch: cursor.ch
          })
          // Move the cursor to end of the line on which we just inserted the
          // \item
          cm.doc.setCursor({
            line: cursor.line + 1,
            ch: lastOpenMark.contentFrom.ch
          })
        }
      } else {
        // If we are not on the same line as the \begin{...}

        // Handle enter command for list environments
        // the enter command will clear the list if you
        // press enter in the last blank item

        // Find if the current open environment is nested within another (list)
        // environment
        var isNestedList = _.find(currentState.openMarks, function (m) {
          return (
            m !== lastOpenMark &&
            (m.kind === 'enumerate' || m.kind === 'itemize')
          )
        })
        // Attempt to find the closing mark (the \end{...})
        var envClosed = findClosedMark(cm, lastOpenMark)
        var line = cm.getLine(cursor.line)
        // Strip the line the cursor is on of any whitespace and the \item
        // command
        var strippedLine = cm
          .getRange(
            { line: cursor.line, ch: 0 },
            { line: cursor.line, ch: line.length }
          )
          .replace(/\s*/g, '')
          .replace('\\item', '')

        // If the environment is closed, there are no more items within the
        // environment and the stripped line is on is blank
        // The most likely case here is that the cursor is on the last \item and
        // it is blank
        if (
          envClosed &&
          !checkItemsAfter(cm, lastClosedMark, envClosed.to) &&
          strippedLine === ''
        ) {
          if (!isNestedList) {
            // If not within a nested list
            cm.operation(function () {
              // Hack used to set the cursor after the refresh
              // it seems that this is the only way to get it working
              // at the moment
              _.delay(function () {
                cm.setCursor({ line: envClosed.to.line, ch: 0 })
              }, 20)
              // Delete the blank line that the cursor is on
              cm.execCommand('deleteLine')
              // Insert a line after the \end{...}
              cm.replaceRange('\n', { line: envClosed.to.line, ch: 0 })
              cm.refresh()
            })
          } else {
            // If within a nested list
            // "Move" the current (blank) line out of the nested list. This
            // makes it appear as if a blank \item is being un-indented
            cm.operation(function () {
              // Hack used to set the cursor after the refresh
              // it seems that this is the only way to get it working
              // at the moment
              _.delay(function () {
                cm.setCursor({ line: envClosed.to.line, ch: 0 })
              }, 20)
              // Remove the blank line that the cursor is on
              cm.execCommand('deleteLine')
              // Insert a \item and a newline after the nested \end{...}
              cm.replaceRange('\\item \n', { line: envClosed.to.line, ch: 0 })
              cm.refresh()
            })
          }
        } else {
          // If the environment is not closed or there are more \item commands
          // after the cursor or the current line is not blank
          // Insert a new blank \item on the line below the cursor
          cm.replaceRange('\n\\item ', {
            line: cursor.line,
            ch: cursor.ch
          })
          // If the line the cursor is on is an \item
          if (
            lastClosedMarkAfter.kind === 'item' ||
            lastClosedMarkAfter.kind === 'enumerate-item'
          ) {
            // Move the cursor to the start of the \item on the line below
            cm.doc.setCursor({
              line: cursor.line + 1,
              ch: lastClosedMarkAfter.contentFrom.ch
            })
          }
        }
      }
      // Functionality was handled, don't run default behaviour
      return null
    } else if (COMMANDS_ON_SINGLE_LINE[lastOpenMark.kind]) {
      // If the cursor is inside a section argument

      // If the cursor is at the start of the section argument
      if (
        lastOpenMark.contentFrom.line === cursor.line &&
        lastOpenMark.contentFrom.ch === cursor.ch
      ) {
        // Insert a newline above the \section{...}
        cm.replaceRange('\n', lastOpenMark.from)
        // Functionality was handled, don't run default behaviour
        return null
      }
      // If the cursor is not at the start of the section argument
      cm.operation(function () {
        // Hack used to set the cursor after the refresh
        // it seems that this is the only way to get it working
        // at the moment
        _.delay(function () {
          cm.setCursor({ line: cursor.line + 1, ch: 0 })
        }, 20)
        // Insert a newline below the \section{...}
        cm.replaceRange('\n', { line: cursor.line + 1, ch: 0 })
        cm.refresh()
      })
      // Functionality was handled, don't run default behaviour
      return null
    }
  }

  // If not within an environment, run the default behaviour
  return CodeMirror.Pass
}

/**
 * make some special characters auto-closing (type "{" and you get "{}")
 */
function autoCloseChar(cm, getSetting, openChar, closeChar, typedChar) {
  function insertClosingChar(pos, idx) {
    // Get the chars after the current position
    var nextPos = CodeMirror.Pos(pos.line, pos.ch + 1)
    var nextChar = cm.getRange(pos, nextPos)

    if (typedChar === openChar) {
      // If typing the opening char
      if (openChar !== closeChar || nextChar !== closeChar) {
        // If the next char is not the closing char
        if (nextChar === '' || nextChar.match(/^[`'[\]{} ]+$/)) {
          // If there is no next char, OR
          // if the next char is specially handled,
          // insert the opening and closing char at the current cursor position
          cm.replaceRange(openChar + closeChar, pos)
        } else {
          // Otherwise, just insert the opening char
          cm.replaceRange(openChar, pos)
        }
      }
    } else if (nextChar !== closeChar) {
      // If the typed char is not the closing char, insert the closing char
      // This effectively means that it is a no-op if typing the closing char,
      // as we don't want to insert it again
      cm.replaceRange(closeChar, pos)
    }

    // Move the cursor forward by 1
    if (idx === 0) {
      // For the first cursor, just set the position
      cm.setCursor(nextPos)
    } else {
      // For additional cursors, add them instead
      cm.addSelection(nextPos)
    }
  }

  // Ignore if setting is disabled
  if (!getSetting('autoCloseBrackets')) {
    return CodeMirror.Pass
  }

  if (cm.somethingSelected()) {
    return CodeMirror.Pass
  }

  // For each cursor, insert the closing char
  _.forEach(cm.listSelections(), function (selection, idx) {
    // Because we pass if something is selected (i.e. multiple chars are
    // selected from a single cursor), we know that from() & to() are the same
    var pos = selection.from()
    insertClosingChar(pos, idx)
  })
}

// Helper function to handle the backspace command in list environments
function handleBackspaceListEnvs(cm) {
  // Given a closedMark, it will check that the content inside
  // does not contain any spaces or item commands
  function _isListEnvEmpty(closedMark) {
    return (
      cm
        .getRange(closedMark.contentFrom, closedMark.contentTo)
        .replace(/\s*/g, '')
        .replace(/\\item$/, '') === ''
    )
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
          return (
            (m.kind === 'itemize' || m.kind === 'enumerate') &&
            m.from.line === lastOpenMark.from.line &&
            m.from.ch === lastOpenMark.from.ch
          )
        }
      )
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
          var lineRange = cm.getRange(currentPos, {
            line: currentPos.line,
            ch: line.length
          })
          // If the lineBefore the env is a closing env command
          if (lineBefore && lineBefore.match(/\\end{.*}/)) {
            // The line above the \begin{..} is a closing env
            // Move text for the current \item out of the env and remove the
            // old \item line

            // Insert the text after \item at the beginning of the line above
            // and insert a newline after
            cm.replaceRange(lineRange + '\n', {
              line: currentPos.line - 1,
              ch: 0
            })
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
              cm.replaceRange('', closedEnvironment.from, closedEnvironment.to)
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
              cm.replaceRange(lineRange, {
                line: currentPos.line - 2,
                ch: beforeLength
              })

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
              cm.replaceRange(lineRange + '\n', {
                line: currentPos.line - 1,
                ch: 0
              })

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
      var closedEnvLineBefore = _.find(token.state.marks, function (m) {
        return (
          (m.kind === 'itemize' || m.kind === 'enumerate') &&
          m.to.line === currentPos.line - 1
        )
      })

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
          cm.replaceRange('', closedEnvLineBefore.from, closedEnvLineBefore.to)
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
            cm.replaceRange(lineRange, {
              line: currentPos.line - 2,
              ch: lineBeforeLength
            })

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
  } else if (
    // We are not inside a list env, but if the last token is a list
    lastClosedMark &&
    (lastClosedMark.kind === 'itemize' || lastClosedMark.kind === 'enumerate')
  ) {
    // If at the begining of the line immediately after the list
    if (currentPos.line === lastClosedMark.to.line + 1 && currentPos.ch === 0) {
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

function handleDeleteListEnvs(cm) {
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

function handleBackspaceAbstract(cm) {
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
      (currentPos.ch === 0 &&
        currentPos.line === lastOpenMark.contentFrom.line + 1) ||
      _.isEqual(currentPos, lastOpenMark.contentFrom)
    ) {
      // Look through all marks to find the closed abstract mark (open marks
      // don't have a to object)
      var closedMark = _.find(
        cm.getStateAfter(cm.doc.lineCount(), true).marks,
        function (m) {
          return (
            m.kind === 'abstract' &&
            m.from.line === lastOpenMark.from.line &&
            m.from.ch === lastOpenMark.from.ch
          )
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
    if (currentPos.line === lastClosedMark.to.line + 1 && currentPos.ch === 0) {
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

function handleDeleteAbstract(cm) {
  var currentPos = cm.doc.getCursor()
  var token = cm.getTokenAt(currentPos, true)
  var lastOpenMark = _.last(token.state.openMarks)
  var line = cm.getLine(currentPos.line)

  var openAbstractAfter = (function () {
    var lineAfter = cm.getLine(currentPos.line + 1)
    if (!lineAfter) return

    // Find the token for the end of the line below the cursor
    var token = cm.getTokenAt(
      {
        line: currentPos.line + 1,
        ch: lineAfter.length
      },
      true
    )

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
      (currentPos.ch === 0 &&
        currentPos.line === lastOpenMark.contentFrom.line + 1) ||
      // Or if cursor is immediately after the closing curly brace of the
      // \begin{..}
      _.isEqual(currentPos, lastOpenMark.contentFrom)
    ) {
      // Look through all marks to find the closed abstract mark (open marks
      // don't have a to object)
      var closedMark = _.find(
        cm.getStateAfter(cm.doc.lineCount(), true).marks,
        function (m) {
          return (
            m.kind === 'abstract' &&
            m.from.line === lastOpenMark.from.line &&
            m.from.ch === lastOpenMark.from.ch
          )
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
function handleBackspaceCommandsSingleLine(cm) {
  var currentPos = cm.doc.getCursor()
  var token = cm.getTokenAt(currentPos, true)
  var lastOpenMark = _.last(token.state.openMarks)
  var lastClosedMark = _.last(token.state.marks)
  var line = cm.getLine(currentPos.line)

  // If we are inside a section command, and the section is at the start of
  // the current line
  if (lastOpenMark && COMMANDS_ON_SINGLE_LINE[lastOpenMark.kind]) {
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
  } else if (lastClosedMark && COMMANDS_ON_SINGLE_LINE[lastClosedMark.kind]) {
    if (
      // If the cursor are at the end of the section command
      (lastClosedMark.to.line === currentPos.line &&
        lastClosedMark.to.ch === currentPos.ch) ||
      // Or the the cursor is at the beginning of the line after the section
      // command
      (currentPos.line === lastClosedMark.to.line + 1 && currentPos.ch === 0)
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
function handleDeleteCommandsSingleLine(cm) {
  var currentPos = cm.doc.getCursor()
  var token = cm.getTokenAt(currentPos, true)
  var lastOpenMark = _.last(token.state.openMarks)
  var line = cm.getLine(currentPos.line)

  var marksAfter = filterMarksInRange(
    cm,
    { line: currentPos.line + 1, ch: 0 },
    'EOL'
  )
  var marksEol = filterMarksInRange(cm, { line: currentPos.line, ch: 0 }, 'EOL')

  // TODO: I'm not exactly sure that this comment is correct. But the
  // intention of the code is not clear to me
  // Find the first section command mark on the lines on the current line or
  // below the current line
  var cmdSingleLineAfter = _.find(_.union(marksAfter, marksEol), function (m) {
    return COMMANDS_ON_SINGLE_LINE[m.kind]
  })

  // If we are inside a section command, and the section is at the start of
  // the current line
  if (lastOpenMark && COMMANDS_ON_SINGLE_LINE[lastOpenMark.kind]) {
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
          cm.replaceRange('', currentPos, { line: currentPos.line + 1, ch: 0 })
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
function deleteClosingCharForSelection(cm) {
  function deleteClosingChar(pos) {
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
  cm.listSelections()
    .reverse()
    .forEach(function (selection) {
      // Because we pass if something is selected (i.e. multiple chars are
      // selected from a single cursor), we know that from() & to() are the same
      var pos = selection.from()
      deleteClosingChar(pos)
    })

  return CodeMirror.Pass
}

function filterMarksInRange(cm, from, to) {
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

/**
 * Try to find where a given mark ends using the state at the end of the
 * document
 */
function findClosedMark(cm, openMark) {
  var lastLine = { line: cm.doc.lineCount(), ch: 0 }
  var stateAfter = cm.getTokenAt(lastLine, true).state

  return _.find(stateAfter.marks, function (i) {
    return (
      i.kind === openMark.kind &&
      _.isEqual(i.contentFrom, openMark.contentFrom) &&
      _.isEqual(i.from, openMark.from)
    )
  })
}

/**
 * Helper function used to check if there are any more \item commands after a
 * given mark and a range
 */
function checkItemsAfter(cm, mark, to) {
  var state = cm.getTokenAt(to, true).state

  return _.find(state.marks, function (m) {
    return (
      (m.kind === 'item' || m.kind === 'enumerate-item') &&
      m.from.line > mark.from.line &&
      m.to.line <= to.line
    )
  })
}

function handleKeyUp(cm, e) {
  if (e.which === BACKSLASH_KEY) {
    // Always show autocomplete after backslash
    cm.showHint()
  } else if (
    e.which === BACKSPACE_KEY ||
    e.which === COMMA_KEY ||
    e.which === SPACE_KEY ||
    /^[a-zA-Z0-9]+$/.test(String.fromCharCode(e.which))
  ) {
    // Show autocomplete after backspace, comma, space or after letter
    const cursor = cm.getCursor()
    const token = cm.getTokenAt(cursor)
    const tokenBeforeCursor = cm.getTokenAt({
      line: cursor.line,
      ch: token.start - 1
    })

    // If the token string starts with a backslash (i.e. it is a command)
    // Or the type of the token is an argument and the token before the cursor
    // is a \begin command
    // Then show the autocomplete
    if (
      token.string.match(/^\\/) ||
      (token.type === 'keyword' && tokenBeforeCursor.string === '\\begin')
    ) {
      cm.showHint()
    } else {
      // If the cursor is within an argument, attempt to find the command for
      // the argument
      const commandMark = _.last(token.state.openMarks)
      if (!commandMark) return // Not within a command, ignore

      // If the command is a bibtex command, show autocomplete
      if (BIBTEX_COMMANDS.indexOf(`\\${commandMark.kind}`) !== -1) {
        cm.showHint()
      }
    }
  }
}
