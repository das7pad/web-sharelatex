/* global _ */

import { focus } from '../utils/focus'
import {
  markEntirelyWithinSelection,
  selectionStartsAtMarkContentStart,
  selectionEndsAtMarkContentEnd
} from '../utils/selection'
import { updateMarkWithClosingPosition, removeMark } from '../latex_mode/mark'

const MARKS_DISALLOWED_WITHIN_HEADERS = [
  'chapter',
  'section',
  'subsection',
  'subsubsection',
  'itemize',
  'enumerate'
]

const HEADER_MARKS = {
  'chapter': MARKS_DISALLOWED_WITHIN_HEADERS,
  'chapter\\*': MARKS_DISALLOWED_WITHIN_HEADERS,
  'section': MARKS_DISALLOWED_WITHIN_HEADERS,
  'section\\*': MARKS_DISALLOWED_WITHIN_HEADERS,
  'subsection': MARKS_DISALLOWED_WITHIN_HEADERS,
  'subsection\\*': MARKS_DISALLOWED_WITHIN_HEADERS,
  'subsubsection': MARKS_DISALLOWED_WITHIN_HEADERS,
  'subsubsection\\*': MARKS_DISALLOWED_WITHIN_HEADERS
}

const BOLD_OR_ITALIC_MARKS = ['textbf', 'textit']

const MARKS_WITH_SPECIAL_HANDLING = BOLD_OR_ITALIC_MARKS.concat(
  _.keys(HEADER_MARKS)
)

/**
 * Select the line which the cursor is on
 *
 * @param {CodeMirror} cm
 */
function selectLine (cm) {
  const cursor = cm.getCursor()
  const { state } = cm.getTokenAt(cursor, true)
  const lastOpenMark = _.last(state.openMarks)

  const withinUnhandledMark = (
    lastOpenMark &&
    !_.contains(MARKS_WITH_SPECIAL_HANDLING, lastOpenMark.kind)
  )

  // If outside of mark or within a mark which has no special handling, select
  // the whole line which the cursor is on
  if (!lastOpenMark || withinUnhandledMark) {
    cm.setSelection({ line: cursor.line, ch: 0 }, { line: cursor.line })
  }
}

/**
 * Remove marks from the current selection, if wrapping with the same kind of
 * mark. For example if "foo \textbf{bar} baz" is selected and attempting to
 * wrap in bold, we need to remove the inner \textbf command as it is
 * unnecessary
 *
 * @param {CodeMirror} cm
 * @param {string} preText
 * @param {Range} selection
 */
function removeInnerMarks (cm, preText, selection) {
  const selectionEnd = selection.to()
  // Get state precisely up to where the selection ends, resolving recent edits
  // before returning editor state
  const { state } = cm.getTokenAt(selectionEnd, true)

  // Find marks that are within the selection of the same kind and remove them
  _.filter(state.marks, (mark) => {
    const isRemovableMark = _.contains(MARKS_WITH_SPECIAL_HANDLING, mark.kind)
    const isMarkSameKindAsWrap = preText.match(mark.kind)
    const withinSelection = markEntirelyWithinSelection(mark, selection)

    return isRemovableMark && isMarkSameKindAsWrap && withinSelection
  })
    // Marks must be removed in reverse order so that character positions are
    // updated correctly for each removal
    .reverse()
    .forEach((mark) => removeMark(cm, mark))
}

/**
 * Determine if current selection is within a header command that cannot have a
 * nested command within it
 *
 * @param {Array.<Mark>} openMarks
 * @param {string} preText
 * @returns {boolean}
 */
function withinHeaderMark (openMarks, preText) {
  return Boolean(_.find(openMarks, (mark) => {
    // Determine if the open mark is a header & can have nested inner marks
    const marksDisallowedInHeaders = HEADER_MARKS[mark.kind]
    if (!marksDisallowedInHeaders) return false

    // Determine if attempting to wrap in a mark which is un-nestable
    return Boolean(
      _.find(marksDisallowedInHeaders, (innerMark) => preText.match(innerMark))
    )
  }))
}

/**
 * Determine if current selection is within a "nested" bold or italic mark. For
 * example: \textbf{\textit{foo}} where the selection is "foo". In this case we
 * need to prevent wrapping with bold, as we are already within a bold command
 *
 * @param {Array.<Mark>} openMarks
 * @param {string} preText
 * @returns {boolean}
 */
function withinNestedBoldOrItalicMark (openMarks, preText) {
  // Pop off the inner mark, it is unimportant here. If the selection is not
  // nested, then openMarksTo will be empty and thus isSelectionMarked is
  // falsy. This is fine because we are only interested in nested marks here
  openMarks.pop()

  return Boolean(_.find(openMarks, (mark) => {
    const isWithinBoldOrItalic = _.contains(BOLD_OR_ITALIC_MARKS, mark.kind)
    if (!isWithinBoldOrItalic) return false

    // Determine if attempting to wrap in \textbf or \textit
    return preText.match(mark.kind)
  }))
}

/**
 * Determine if wrapping selection would cause nesting of commands that is
 * disallowed
 *
 * @param {CodeMirror} cm
 * @param {string} preText
 * @param {Range} selection
 * @returns {boolean}
 */
function cannotNestMarks (cm, preText, selection) {
  const selectionEnd = selection.to()
  // Get state precisely up to where the selection ends, resolving recent edits
  // before returning editor state
  const { state } = cm.getTokenAt(selectionEnd, true)
  const openMarks = _.clone(state.openMarks) || []

  return withinHeaderMark(openMarks, preText) ||
    withinNestedBoldOrItalicMark(openMarks, preText)
}

/**
 * Determine current selection is within the content of a bold or italic mark
 * and if so, handle correctly wrapping with pre/post text.
 *
 * Returns false to indicate that "normal" wrapping should be done, or true if
 * wrapping has been handled within the function
 *
 * @param {CodeMirror} cm
 * @param {string} preText
 * @param {string} postText
 * @param {Range} selection
 * @returns {boolean}
 */
function withinBoldOrItalicMarkContent (cm, preText, postText, selection) {
  let selectionStart = _.clone(selection.from())
  let selectionEnd = _.clone(selection.to())
  let selectedText = cm.getRange(selectionStart, selectionEnd)

  // Get state precisely up to where the selection ends, resolving recent edits
  // before returning editor state
  const { state } = cm.getTokenAt(selectionEnd, true)

  // Find mark content for the mark that we are within
  let mark = _.last(state.openMarks)

  // If not within an bold or italic mark, return false to perform normal
  // wrapping
  if (!(mark && _.contains(BOLD_OR_ITALIC_MARKS, mark.kind))) return false
  // If not attempting to wrap with bold or italics, return false to perform
  // normal wrapping

  // Update mark to find closing positions - because it is initially found
  // using the selection - which may end before the mark is closed - the closing
  // position is not included
  mark = updateMarkWithClosingPosition(cm, mark)

  if (!(mark && preText.match(mark.kind))) return false

  const textLeftOfSelection = cm.getRange(mark.contentFrom, selectionStart)
  const textRightOfSelection = cm.getRange(selectionEnd, mark.contentTo)
  const [whitespaceRightOfSelection] = textRightOfSelection.match(/^\s*/)
  const [whitespaceLeftOfSelection] = textLeftOfSelection.match(/\s*$/)

  const selectionAtStart = selectionStartsAtMarkContentStart(selection, mark)
  const selectionAtEnd = selectionEndsAtMarkContentEnd(selection, mark)

  if (selectionAtStart && selectionAtEnd) {
    // Everything within the mark is selected, so the mark must be removed. For
    // example, un-bolding a bold mark
    removeMark(cm, mark)
  } else if (selectionAtStart) {
    // If the selection starts at the beginning of the content, move the
    // selection before the mark

    // If selection ends after whitespace before the next word, adjust
    // selection to include whitespace
    if (whitespaceRightOfSelection) {
      // Move selection forward over the whitespace, up to the next word
      selectionEnd.ch += whitespaceRightOfSelection.length
      // Append whitespace to the selected text to mirror the change to the
      // selection
      selectedText += ' '
    }

    cm.operation(() => {
      // Delete the old selection
      cm.replaceRange('', selectionStart, selectionEnd)
      // Insert the selection before the mark
      cm.replaceRange(selectedText, mark.from)
    })
  } else if (selectionAtEnd) {
    // If the selection ends at the end of the content, move the selection
    // after the mark

    // If selection starts before whitespace before the previous word, adjust
    // selection to include whitespace
    if (whitespaceLeftOfSelection) {
      // Move selection backward over the whitespace, up to the previous word
      selectionStart.ch -= whitespaceLeftOfSelection.length
      // Prepend whitespace to the selected text to mirror the change to the
      // selection
      selectedText = ` ${selectedText}`
    }

    cm.operation(() => {
      // Insert the selection after the mark
      cm.replaceRange(selectedText, mark.to)
      // Delete the old selection
      cm.replaceRange('', selectionStart, selectionEnd)
    })
  } else {
    // If the selection is within the content (i.e. not at the beginning
    // or the end), we need to close the mark before the selection and open
    // a new mark after the selection

    // If there is whitespace to right of the selection, adjust to include the
    // whitespace
    if (whitespaceRightOfSelection) {
      selectionEnd.ch += whitespaceRightOfSelection.length
    }

    // If there is whitespace to left of the selection ends, adjust to include
    // the whitespace
    if (whitespaceLeftOfSelection) {
      selectionStart.ch -= whitespaceLeftOfSelection.length
    }

    cm.operation(() => {
      // Open a new mark after the selection
      cm.replaceRange(preText, selectionEnd)
      // Then close existing mark before the selection, effectively moving the
      // selection and any remaining content after it
      cm.replaceRange(postText, selectionStart)
    })
  }

  // Return true to skip "normal" wrapping - it is handled above
  return true
}

/**
 * Prepend with newline, unless the selection is already at the start of a line
 *
 * @param {string} preText
 * @param {Range} selection
 * @returns {string}
 */
function ensureNewlineBefore (preText, selection) {
  const { ch } = selection.from()
  return ch === 0 ? preText : '\n' + preText
}

/**
 * Append with newline, unless the selection is already at the end of a line
 *
 * @param {CodeMirror} cm
 * @param {string} postText
 * @param {Range} selection
 * @returns {string}
 */
function ensureNewlineAfter (cm, postText, selection) {
  const { line, ch } = selection.to()
  return ch === cm.getLine(line).length ? postText : postText + '\n'
}

/**
 * Wrap selected text with pre & post text
 *
 * @param {CodeMirror} cm
 * @param {string} pre
 * @param {string} post
 * @param {boolean} wrapWholeLine
 */
function wrap (cm, pre, post, wrapWholeLine = false) {
  if (wrapWholeLine && !cm.somethingSelected()) {
    selectLine(cm)
  }

  cm.operation(() => {
    let selections = cm.listSelections()
    let cachedSelection

    for (let i = 0; i < selections.length; i++) {
      removeInnerMarks(cm, pre, selections[i])

      if (cannotNestMarks(cm, pre, selections[i])) {
        selections = cm.listSelections()
        continue
      } else if (withinBoldOrItalicMarkContent(cm, pre, post, selections[i])) {
        selections = cm.listSelections()
        continue
      }

      if (wrapWholeLine) {
        pre = ensureNewlineBefore(pre, selections[i])
        post = ensureNewlineAfter(cm, post, selections[i])
      }

      // +wrap argument used by CM to merge any following replaceRange with
      // same +wrap argument into one history change. Note: The next history
      // change must be done within the set historyEventDelay
      cm.replaceRange(pre, selections[i].from(), null, '+wrap')

      // The array of selections is *not* updated when we add/remove characters.
      // To ensure that we are continuing to work with the correct character
      // positions, we call listSelections() to update the selections
      selections = cm.listSelections()
      cm.replaceRange(post, selections[i].to(), null, '+wrap')

      // The array of selections must be updated again, however the previous
      // cm.replaceRange extends the end of the current selection to include the
      // `post` text. We want to rewind it to where it was before we inserted
      // the `post` text, but we still need to move any subsequent selections
      // along by the length of the `post` test.
      cachedSelection = selections[i] // Cache current selection before updating
      selections = cm.listSelections()
      selections[i] = cachedSelection // Restore the cached selection
      cm.setSelections(selections)
    }
  })
  cm.refresh()
  focus(cm)
}

/**
 * Prepend selected lines with \item command
 *
 * @param {CodeMirror} cm
 */
function prependLinesWithItem (cm) {
  const selectedLines = cm.getSelection().split('\n')
  const prependedLines = _.map(selectedLines, (line) => `\\item ${line}`)

  // +wrap argument used by CM to merge any following replaceRange with
  // same +wrap argument into one history change. Note: The next history
  // change must be done within the set historyEventDelay
  cm.replaceSelection(prependedLines.join('\n'), null, '+wrap')
}

/**
 * Insert list environment, surrounding with newlines where applicable
 *
 * @param {CodeMirror} cm
 * @param {string} listType
 */
function wrapListOnNewline (cm, listType) {
  const cursor = cm.getCursor()
  const token = cm.getTokenAt(cursor, true)
  const lineText = cm.getLine(cursor.line)

  if (cursor.ch === 0 || (!lineText && !token.type)) {
    // Cursor ends at beginning of line or the line is empty and not within
    // a mark

    // Open list on same line as cursor and close with a newline below
    wrap(cm, `\\begin{${listType}}\n`, `\n\\end{${listType}}\n`, false)
  } else if (cursor.ch > 0 && cursor.ch < lineText.length) {
    // Cursor ends within the line - not at the beginning or the end

    // Open list on a newline and close with a newline below
    wrap(cm, `\n\\begin{${listType}}\n`, `\n\\end{${listType}}\n`, false)
  } else {
    // Cursor ends at the end of the line

    // Open list on a newline and close without newline below
    wrap(cm, `\n\\begin{${listType}}\n`, `\n\\end{${listType}}`, false)
  }

  prependLinesWithItem(cm)
}

export function wrapBold (cm) {
  wrap(cm, '\\textbf{', '}')
}

export function wrapItalic (cm) {
  wrap(cm, '\\textit{', '}')
}

export function wrapSection (cm) {
  wrap(cm, '\\section{', '}', true)
}

export function wrapSubsection (cm) {
  wrap(cm, '\\subsection{', '}', true)
}

export function wrapInlineMath (cm) {
  wrap(cm, '\\(', '\\)', false)
}

export function wrapDisplayMath (cm) {
  wrap(cm, '\\[', '\\]', true)
}

export function wrapNumberedList (cm) {
  wrapListOnNewline(cm, 'enumerate')
}

export function wrapBulletList (cm) {
  wrapListOnNewline(cm, 'itemize')
}
