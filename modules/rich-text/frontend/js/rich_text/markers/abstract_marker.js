import { makeSingleMark } from '../single_mark'
import { makeGroup } from '../utils'

const AbstractMarker = {
  matcher(cm, sourceMark) {
    return sourceMark.kind === 'abstract'
  },

  marker(cm, sourceMark) {
    // handle bad \begin and \end placement
    if (hasBadBeginOrEndCommand(sourceMark)) return

    const preMark = makeSingleMark(cm, sourceMark, 'pre', true, {
      inclusiveLeft: true,
      inclusiveRight: true,
      replacedWith: makeDiv('Abstract', 'wl-abstract-open')
    })
    const innerMark = makeSingleMark(cm, sourceMark, 'inner', true, {
      inclusiveLeft: true,
      inclusiveRight: true,
      className: 'wl-abstract'
    })
    const postMark = makeSingleMark(cm, sourceMark, 'post', true, {
      inclusiveLeft: true,
      inclusiveRight: true,
      replacedWith: makeDiv(' ', 'wl-abstract-close')
    })

    makeGroup([preMark, innerMark, postMark])
  }
}

function makeDiv(text, className) {
  const el = $('<div>')
    .text(text)
    .addClass(className)
  return el[0]
}

function hasBadBeginOrEndCommand(sourceMark) {
  return (
    spansMoreThanTwoLines(sourceMark) ||
    contentDoesNotStartAfterBeginCommand(sourceMark) ||
    contentDoesNotEndBeforeEndCommand(sourceMark)
  )
}

function spansMoreThanTwoLines(sourceMark) {
  const { contentTo, contentFrom } = sourceMark
  return contentTo.line - contentFrom.line < 2
}

function contentDoesNotStartAfterBeginCommand(sourceMark) {
  return sourceMark.contentFrom.ch !== 16
}

function contentDoesNotEndBeforeEndCommand(sourceMark) {
  return sourceMark.contentTo.ch !== 0
}

export default AbstractMarker
