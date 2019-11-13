import { makeSingleMark } from '../single_mark'
import { makeGroup } from '../utils'

const InputMarker = {
  matcher(cm, sourceMark) {
    return sourceMark.kind === 'input' || sourceMark.kind === 'include'
  },

  marker(cm, sourceMark, rtAdapter) {
    let path = cm.getRange(sourceMark.contentFrom, sourceMark.contentTo)
    if (!path.match(/\.tex$/)) {
      path = path + '.tex'
    }
    const isFileFound = rtAdapter.fileExistsForPath(path)
    const preMark = makeSingleMark(cm, sourceMark, 'pre', false, {
      replacedWith: makeOpeningSpan(isFileFound)
    })

    const innerMark = makeSingleMark(cm, sourceMark, 'inner', true, {
      className: 'wl-input'
    })

    const postMark = makeSingleMark(cm, sourceMark, 'post', false, {
      replacedWith: makeClosingSpan()
    })

    makeGroup([preMark, innerMark, postMark])
  }
}

function makeOpeningSpan(isFileFound) {
  // TODO: Make this clickable so that it opens the linked file
  const icon = $('<i>')
    .addClass('fa fa-fw fa-link')
    .css({
      'border-bottom': isFileFound ? '1px dashed #1C8B22' : '1px dashed #bb1111'
    })
  const bracket = $('<span>')
    .text('{')
    .addClass('wl-label-bracket')

  const span = $('<span>')
    .append(icon)
    .append(bracket)

  return span[0]
}

function makeClosingSpan() {
  const span = $('<span>')
    .text('}')
    .addClass('wl-label-bracket')
  return span[0]
}

export default InputMarker
