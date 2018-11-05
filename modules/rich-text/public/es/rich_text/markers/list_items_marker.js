/* global $ */

import { makeSingleMark } from '../single_mark'

const ListItemsMarker = {
  matcher(cm, sourceMark) {
    return sourceMark.kind === 'item' || sourceMark.kind === 'enumerate-item'
  },

  marker(cm, sourceMark) {
    makeSingleMark(cm, sourceMark, 'outer', true, {
      inclusiveLeft: true,
      inclusiveRight: false,
      replacedWith: makeDiv(sourceMark)
    })
  }
}

function makeDiv(sourceMark) {
  const prefix =
    sourceMark.kind === 'enumerate-item'
      ? `${sourceMark.checkedProperties.number}.`
      : '●'

  const el = $('<div>')
    .text(prefix)
    .addClass(`wl-${sourceMark.kind}-open`)
    .css('margin-left', '-1.5em')

  return el[0]
}

export default ListItemsMarker
