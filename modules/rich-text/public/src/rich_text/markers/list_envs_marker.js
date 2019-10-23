import { makeSingleMark } from '../single_mark'
import { markCoversWholeLines, makeGroup } from '../utils'

const ListEnvsMarker = {
  matcher(cm, sourceMark) {
    return sourceMark.kind === 'itemize' || sourceMark.kind === 'enumerate'
  },

  marker(cm, sourceMark) {
    if (!markCoversWholeLines(cm, sourceMark)) return

    var innerMark = makeSingleMark(cm, sourceMark, 'inner', false, {
      inclusiveLeft: true,
      inclusiveRight: true,
      clearWhenEmpty: false,
      className: `wl-${sourceMark.kind}`
    })

    makeGroup([innerMark].concat(collapsePrePostMark(cm, sourceMark)))
  }
}

function collapsePrePostMark(cm, sourceMark) {
  const preMark = makeSingleMark(cm, sourceMark, 'pre', true, {
    inclusiveLeft: true,
    inclusiveRight: true,
    collapsed: true
  })
  const postMark = makeSingleMark(cm, sourceMark, 'post', true, {
    inclusiveLeft: true,
    inclusiveRight: true,
    collapsed: true
  })

  return [preMark, postMark]
}

export default ListEnvsMarker
