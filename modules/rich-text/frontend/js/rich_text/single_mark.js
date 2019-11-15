import { rangesEqual } from './utils'

const INDENTED_ENVIROMENTS = ['itemize', 'enumerate']

function _clearMatch() {
  this.wlMatched = false
}

function _isMatched() {
  return this.wlMatched
}

function _valueIsCurrent(cm, editorMark, range) {
  return (
    typeof editorMark.wlValue === 'undefined' ||
    cm.getRange(range.from, range.to) === editorMark.wlValue
  )
}

function _propertiesCheck(sourceMark, editorMark) {
  for (var property in editorMark.wlProperties) {
    if (editorMark.wlProperties.hasOwnProperty(property)) {
      if (
        sourceMark.checkedProperties[property] !==
        editorMark.wlProperties[property]
      ) {
        return false
      }
    }
  }
  return true
}

/**
 * Find the first source mark that corresponds to this editor mark. The two
 * marks have to cover the same range of text, and, in the case of a
 * 'static' mark, the current content of the marked region in the editor has
 * to equal the original text.
 *
 * @param {WL.LatexMode.Mark[]} sourceMarks the matched mark is deleted
 */
function _match(cm, sourceMarks) {
  // we compare child marks of a group starting from the parent (the first)
  if (this.wlChild) {
    return
  }

  function matchGroup(sourceMark, editorMark) {
    var sourceMarkRange = sourceMark.rangeForRegion(editorMark.wlRegion)
    var editorMarkRange = editorMark.find()
    if (
      editorMarkRange &&
      rangesEqual(sourceMarkRange, editorMarkRange) &&
      _valueIsCurrent(cm, editorMark, editorMarkRange) &&
      _propertiesCheck(sourceMark, editorMark)
    ) {
      if (editorMark.wlNextMark) {
        return matchGroup(sourceMark, editorMark.wlNextMark)
      } else {
        return true
      }
    } else {
      return false
    }
  }

  function setGroupMatched(editorMark) {
    editorMark.wlMatched = true
    if (editorMark.wlNextMark) {
      setGroupMatched(editorMark.wlNextMark)
    }
  }

  for (var i = 0; i < sourceMarks.length; ++i) {
    var sourceMark = sourceMarks[i]
    if (sourceMark && matchGroup(sourceMark, this)) {
      setGroupMatched(this)
      delete sourceMarks[i]
      return
    }
  }
}

/**
 * Make an editor mark that matches one source mark, or a part of one source
 * mark.
 *
 * Note: We could try to be clever when searching the sourceMarks list and use
 * a binary search on the 'to' or 'contentTo' positions for the source marks
 * (which are guaranteed to be in order), but for now it's just linear.
 */
export function makeSingleMark(cm, sourceMark, region, staticMark, options) {
  const { from, to } = sourceMark.rangeForRegion(region)

  const mark = cm.markText(from, to, options)

  if (INDENTED_ENVIROMENTS.includes(sourceMark.kind)) {
    _.range(from.line, to.line + 1).forEach(i => {
      const openMarksCount =
        sourceMark.checkedProperties.openMarksCount > 4
          ? 4
          : sourceMark.checkedProperties.openMarksCount

      if (i === from.line || i === to.line) {
        cm.doc.removeLineClass(i, 'text')
        cm.doc.addLineClass(i, 'text', `wl-indent-env-${openMarksCount}`)
      } else {
        cm.doc.addLineClass(i, 'text', `wl-indent-${openMarksCount}`)
      }
    })
  } else if (
    sourceMark.openParent &&
    INDENTED_ENVIROMENTS.includes(sourceMark.openParent.kind)
  ) {
    cm.doc.removeLineClass(from.line, 'text')
    cm.doc.addLineClass(
      from.line,
      'text',
      `wl-indent-${sourceMark.openParent.checkedProperties.openMarksCount}`
    )
  }

  mark.wlClearMatch = _clearMatch
  mark.wlMatch = _match
  mark.wlIsMatched = _isMatched

  mark.wlProperties = sourceMark.checkedProperties
  mark.wlRegion = region
  if (staticMark) {
    mark.wlValue = cm.getRange(from, to)
  }

  return mark
}
