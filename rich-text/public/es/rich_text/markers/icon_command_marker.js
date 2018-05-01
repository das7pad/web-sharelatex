/* global $ */

import { makeSingleMark } from '../single_mark'
import { makeGroup } from '../utils'

const ICON_COMMANDS = [
  'label',
  'ref',
  // TODO: extract these to a constant (used in LatexMode too)
  'cite',
  'citep',
  'citet',
  'footcite',
  'nocite',
  'autocite',
  'autocites',
  'citeauthor',
  'citeyear',
  'parencite',
  'citealt',
  'textcite',
  'cref',
  'Cref'
]

const IconCommandMarker = {
  matcher (cm, sourceMark) {
    return ICON_COMMANDS.includes(sourceMark.kind)
  },

  marker (cm, sourceMark) {
    const preMark = makeSingleMark(cm, sourceMark, 'pre', true, {
      replacedWith: makeOpenSpan(sourceMark)
    })
    const postMark = makeSingleMark(cm, sourceMark, 'post', true, {
      replacedWith: makeClosingSpan()
    })

    makeGroup([preMark, postMark])
  }
}

function makeOpenSpan (sourceMark) {
  const iconClass = sourceMark.kind.match(/cite/)
    ? 'fa-book'
    : 'fa-tag'

  const icon = $('<span>')
    .addClass(`fa fa-fw ${iconClass}`)
  const bracket = $('<span>')
    .text('{')
    .addClass('wl-label-bracket')

  const span = $('<span>')
    .addClass('wl-label-open')
    .prepend(icon)
    .append(bracket)

  return span[0]
}

function makeClosingSpan () {
  const span = $('<span>')
    .text('}')
    .addClass('wl-label-bracket')

  return span[0]
}

export default IconCommandMarker
