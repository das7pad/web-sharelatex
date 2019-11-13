import { makeSingleMark } from '../single_mark'
import { makeGroup } from '../utils'

const SectionMarker = {
  matcher(cm, sourceMark) {
    const validKinds = [
      'chapter',
      'chapter\\*',
      'section',
      'section\\*',
      'subsection',
      'subsection\\*',
      'subsubsection',
      'subsubsection\\*'
    ]
    return validKinds.includes(sourceMark.kind) && sourceMark.hasContent(cm)
  },

  marker(cm, sourceMark) {
    let className
    if (/^chapter/.test(sourceMark.kind)) {
      className = 'chapter'
    } else if (/^subsub/.test(sourceMark.kind)) {
      className = 'subsubsection'
    } else if (/^sub/.test(sourceMark.kind)) {
      className = 'subsection'
    } else {
      className = 'section'
    }

    const shouldSurroundWithBraces = isSplitOverMultipleLines(cm, sourceMark)

    const preMark = makeSingleMark(cm, sourceMark, 'pre', true, {
      inclusiveLeft: !shouldSurroundWithBraces,
      inclusiveRight: false,
      replacedWith: makeSpan(shouldSurroundWithBraces ? '{' : '', className)
    })
    const innerMark = makeSingleMark(cm, sourceMark, 'inner', false, {
      inclusiveLeft: true,
      inclusiveRight: true,
      className: 'wl-' + className
    })
    const postMark = makeSingleMark(cm, sourceMark, 'post', true, {
      inclusiveLeft: false,
      inclusiveRight: !shouldSurroundWithBraces,
      replacedWith: makeSpan(shouldSurroundWithBraces ? '}' : '', className)
    })

    makeGroup([preMark, innerMark, postMark])
  }
}

function isSplitOverMultipleLines(cm, sourceMark) {
  const { from, to } = sourceMark
  const line = cm.getLine(from.line)
  if (
    (from.line === to.line && to.ch !== line.length) ||
    from.line !== to.line
  ) {
    return true
  }
  return false
}

function makeSpan(text, className) {
  const el = $('<span>')
    .text(text)
    .addClass('wl-' + className + '-open')
  return el[0]
}

export default SectionMarker
