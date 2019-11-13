/**
 * We want to parse quite a bit past the viewport, because otherwise the
 * scrolling is quite jerky as we pause to re-render a lot of mathematics.
 *
 * Note that CodeMirror has a viewportMargin setting that is quite low by
 * default; we could instead increase that setting, but the manual recommends
 * against changing it.
 */
const VIEWPORT_PADDING_LINES = 100

/**
 * The IEEE template has an impressive 325 lines of (mostly) comments before
 * it gets to a maketitle command, so we always want to read the first chunk
 * of the document.
 */
const VIEWPORT_MIN_LINE = 350

/**
 * Get the line number for the last visible line. Note: the last line might not
 * be visible, as CodeMirror renders "padding" lines just beyond the viewport
 * to prevent lagging behind with fast scrolling
 *
 * @param {CodeMirror} cm
 * @returns {number}
 */
export function lastRenderedLine(cm) {
  const { to } = cm.getViewport()
  const lastLine = to + VIEWPORT_PADDING_LINES

  return lastLine < VIEWPORT_MIN_LINE ? VIEWPORT_MIN_LINE : lastLine
}

/**
 * Get all rich text marks for the document
 *
 * @param {CodeMirror} cm
 * @returns {Array.<Mark>}
 */
export function getMarks(cm) {
  const marks = cm.getStateAfter(lastRenderedLine(cm), true).marks
  return marks || []
}

/**
 * Compare two CodeMirror positions on line and character.
 *
 * @param {CodeMirror.Pos} x
 *
 * @param {CodeMirror.Pos} y
 */
export function positionsEqual(x, y) {
  return x.line === y.line && x.ch === y.ch
}

/**
 * Compare two CodeMirror ranges by comparing the from and to positions.
 *
 * @param {CodeMirror.Range} x
 *
 * @param {CodeMirror.Range} y
 */
export function rangesEqual(x, y) {
  return positionsEqual(x.from, y.from) && positionsEqual(x.to, y.to)
}

/**
 * There is no text before the mark on the line where it starts and no text
 * after the mark on the line where it ends. This means it's safe to hide the
 * first and last lines --- that is, no marks would overlap.
 *
 * @param {CodeMirror} cm
 * @param {Mark} sourceMark
 * @return {Boolean}
 */
export function markCoversWholeLines(cm, sourceMark) {
  const { from, to } = sourceMark

  return from.ch === 0 && to.ch === cm.getLine(to.line).length
}

export function ignoreErrors(cb) {
  try {
    return cb()
  } catch (e) {
    // ignore
  }
}

export function deTex(string) {
  string = string.replace(/\\LaTeX/g, 'LaTeX')
  string = string.replace(/\\TeX/g, 'TeX')
  string = string.replace(/\\TikZ/g, 'TikZ')
  string = string.replace(/\\BibTeX/g, 'BibTeX')
  string = string.replace(/\\\[[A-Za-z0-9. ]*\]/g, ' ') // line spacing
  string = string.replace(/\\(?:[a-zA-Z]+|.|)/g, '')
  string = string.replace(/{}|~/g, ' ')
  string = string.replace(/[${}]/g, '')
  string = string.replace(/ +/g, ' ')
  return string.trim()
}

export function splitAuthors(string) {
  string = string.replace(/\\and|\n/g, '\\\\')
  return string.split('\\\\').map(s => s.trim())
}

/**
 * When the user clicks the element, clear the mark and put the cursor at the
 * start of the mark.
 *
 * We could do something more clever here to try to figure out where they
 * clicked on the mark and then put their cursor in the right place. For
 * equations, this would be difficult but quite useful. For the preamble, it
 * would probably not be too hard.
 *
 * @param {CodeMirror} cm
 * @param {Element} element
 * @param {CodeMirror.TextMarker} mark
 */
export function clearOnMouseDown(cm, element, mark) {
  $(element).on('mousedown', function() {
    var markPos = mark.find()
    if (markPos) {
      cm.setCursor(markPos.from)
    }
    mark.clear()
    cm.refresh()
    // clicking the mark seems to make the editor lose focus; I'm not sure
    // why we have to wait before refocusing, but I can't find any other way
    // of doing it
    setTimeout(() => {
      cm.focus()
    }, 0)
  })
}

/**
 * Link the given TextMarkers together as a group; all of them have to be
 * matched in order for any of them to be retained.
 *
 * @param {CodeMirror.TextMarker[]} marks
 * @return {CodeMirror.TextMarker[]} marks with group data attached
 */
export function makeGroup(marks) {
  const clearAll = () => marks.forEach(mark => mark.clear())

  marks.forEach((mark, markIndex) => {
    mark.on('clear', clearAll)
    mark.on('hide', clearAll)
    mark.wlNextMark = marks[markIndex + 1]
    mark.wlChild = markIndex > 0
  })

  return marks
}
