import { positionsEqual } from './utils'

const ORIGIN_POS = {
  line: 0,
  ch: 0
}

function _clearMatch() {
  this.wlMatched = false
}
function _isMatched() {
  return this.wlMatched
}

/**
 * @param {Mark[]} sourceMarks the matched marks are deleted
 */
function _match(cm, sourceMarks) {
  var titleIndex = -1
  var authorIndex = -1
  var maketitleIndex = -1

  for (var i = 0; i < sourceMarks.length; ++i) {
    var sourceMark = sourceMarks[i]
    if (sourceMark) {
      if (
        sourceMark.kind === 'title' &&
        sourceMark.getContent(cm) === this.wlTitle
      ) {
        titleIndex = i
      } else if (
        sourceMark.kind === 'author' &&
        sourceMark.getContent(cm) === this.wlAuthor
      ) {
        authorIndex = i
      } else if (sourceMark.kind === 'maketitle') {
        var range = this.find()
        if (
          positionsEqual(ORIGIN_POS, range.from) &&
          positionsEqual(sourceMark.to, range.to)
        ) {
          maketitleIndex = i
        }
      }
    }
  }

  if (
    titleIndex >= 0 &&
    maketitleIndex >= 0 &&
    (!this.wlAuthor || authorIndex >= 0)
  ) {
    delete sourceMarks[titleIndex]
    delete sourceMarks[maketitleIndex]
    if (authorIndex >= 0) {
      delete sourceMarks[authorIndex]
    }
    this.wlMatched = true
  }
}

/**
 * Make an editor mark that collapses the preamble. This editor mark matches
 * several source marks: title, author and the \maketitle command; it has to
 * be kept in sync with all of them.
 */
export function makePreambleMark(cm, titleMark, authorMark, maketitleMark) {
  var mark = cm.markText(ORIGIN_POS, maketitleMark.to, {
    clearOnEnter: true,
    collapsed: true,
    inclusiveRight: true
  })

  mark.wlTitle = titleMark.getContent(cm)
  if (authorMark) {
    mark.wlAuthor = authorMark.getContent(cm)
  } else {
    mark.wlAuthor = null
  }

  mark.wlClearMatch = _clearMatch
  mark.wlMatch = _match
  mark.wlIsMatched = _isMatched
  return mark
}
