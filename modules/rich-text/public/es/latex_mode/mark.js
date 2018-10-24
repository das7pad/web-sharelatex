/* global _ */

/**
 * A mark identifies a range of source code that may be replaced with a
 * CodeMirror TextMarker.
 *
 * Marks MUST be treated as immutable, because they're used in the mode state,
 * and CodeMirror doesn't copy them for us (and we haven't implemented a custom
 * copyState for this mode).
 *
 * A mark is open when we've found its beginning but not its end; once we find
 * the end, we create a new closed mark to replace the open one, because marks
 * are immutable.
 *
 * Some properties of Marks:
 *
 * 1. Some kinds of marks can be nested, but marks never overlap in other ways.
 * The main reasons for allowing nesting is that we want to allow math in
 * section headings, and we also want to be able to handle labels in math. Math
 * within math is not desirable, because MathJAX can handle that itself. Math
 * within inline formatting is also not desirable, because it probably won't
 * have the effect that the user intended; e.g. math inside \textbf is not
 * actually rendered as bold.
 *
 * 2. No two marks are equal. Moreover, no inner or outer ranges are equal to
 * any other inner or outer ranges.
 *
 * 3. No closed mark has `to` equal to `from`, but `contentTo` may equal
 * `contentFrom`.
 *
 * 4. The order in which (closed) marks appear in the mode state is the order in
 * which they are closed. That is, the `to` positions are in ascending order in
 * the set of marks. The same is true of the `contentTo` positions.
 *
 */
export default class Mark {
  constructor (kind, from, contentFrom, contentTo, to, openParent) {
    this.kind = kind
    this.from = from
    this.to = to
    this.contentFrom = contentFrom
    this.contentTo = contentTo
    this.openParent = openParent
    this.checkedProperties = {}
  }

  /**
   * New shallow copy of an existing mark. Note: this copies only the standard
   * properties used in the constructor.
   *
   * @param {Mark} mark
   *
   * @return {Mark}
   */
  copy () {
    return new Mark(
      this.kind,
      this.from,
      this.to,
      this.contentFrom,
      this.contentTo,
      this.openParent
    )
  }

  getOuter (cm) {
    return cm.getRange(this.from, this.to)
  }

  getContent (cm) {
    return cm.getRange(this.contentFrom, this.contentTo)
  }

  hasContent (cm) {
    return this.getContent(cm).trim().length
  }

  containsCursor (cm, region) {
    var cursor = cm.getCursor('head')
    if (region === 'inner') {
      return _positionInRange(cm, cursor, this.contentFrom, this.contentTo)
    } else if (region === 'outer') {
      return _positionInRange(cm, cursor, this.from, this.to)
    } else {
      throw new Error(`bad region ${region}`)
    }
  }

  rangeForRegion (region) {
    if (region === 'pre') {
      return { from: this.from, to: this.contentFrom }
    } else if (region === 'inner') {
      return { from: this.contentFrom, to: this.contentTo }
    } else if (region === 'post') {
      return { from: this.contentTo, to: this.to }
    } else if (region === 'outer') {
      return this
    } else {
      throw new Error('bad region ' + region)
    }
  }
}

function _positionInRange (cm, position, from, to) {
  var positionIndex = cm.indexFromPos(position)
  var rangeFromIndex = cm.indexFromPos(from)
  var rangeToIndex = cm.indexFromPos(to)
  return rangeFromIndex <= positionIndex && positionIndex <= rangeToIndex
}

/**
 * Utility to update a mark with it's closing position. If a mark is found using
 * a selection range that ends before the mark is closed, then it's closing
 * position will be undefined.
 *
 * To get the closing position we must search all marks within the document for
 * one that matches the input mark
 *
 * @param {CodeMirror} cm
 * @param {Mark} mark
 */
export function updateMarkWithClosingPosition (cm, mark) {
  // Find all of the marks within the document
  const { state } = cm.getTokenAt({
    line: cm.lastLine() + 1,
    ch: 0
  }, true)

  // Search through the marks to find the one that matches exactly
  return _.find(state.marks, (m) => {
    return m.kind === mark.kind &&
      _.isEqual(m.contentFrom, mark.contentFrom) &&
      _.isEqual(m.from, mark.from)
  })
}

/**
 * Remove a mark
 *
 * @param {CodeMirror} cm
 * @param {Mark} mark
 */
export function removeMark (cm, mark) {
  cm.operation(() => {
    // replace contentTo -> to
    cm.replaceRange('', mark.contentTo, mark.to)
    // replace from -> contentFrom
    cm.replaceRange('', mark.from, mark.contentFrom)
  })
}
