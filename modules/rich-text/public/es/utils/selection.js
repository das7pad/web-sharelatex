/**
 * Determine if a mark is entirely within a range
 *
 * @param {Mark} mark
 * @param {Range} selection
 * @returns {boolean}
 */
export function markEntirelyWithinSelection(mark, selection) {
  const rangeStart = selection.from()
  const rangeEnd = selection.to()

  return (
    mark.from.line >= rangeStart.line &&
    mark.from.ch >= rangeStart.ch &&
    mark.to.line <= rangeEnd.line &&
    mark.to.ch <= rangeEnd.ch
  )
}

/**
 * Determine if a range starts at the same position as a mark's content
 *
 * @param {Range} selection
 * @param {Mark} mark
 * @returns {boolean}
 */
export function selectionStartsAtMarkContentStart(selection, mark) {
  const selectionStart = selection.from()

  return (
    mark.contentFrom.line === selectionStart.line &&
    mark.contentFrom.ch === selectionStart.ch
  )
}

/**
 * Determine if a range ends at the same position as a mark's content
 *
 * @param {Range} selection
 * @param {Mark} mark
 * @returns {boolean}
 */
export function selectionEndsAtMarkContentEnd(selection, mark) {
  const selectionEnd = selection.to()

  return (
    mark.contentTo.line === selectionEnd.line &&
    mark.contentTo.ch === selectionEnd.ch
  )
}
