import { makeSingleMark } from '../single_mark'
import { clearOnMouseDown } from '../utils'

const MathMarker = {
  matcher(cm, sourceMark) {
    const validKinds = ['inline-math', 'display-math', 'outer-display-math']
    return (
      validKinds.includes(sourceMark.kind) &&
      sourceMark.hasContent(cm) &&
      !sourceMark.containsCursor(cm, 'outer')
    )
  },

  marker(cm, sourceMark) {
    let replacement
    if (sourceMark.kind === 'inline-math') {
      replacement = makeInlineMath(sourceMark.getContent(cm))
    } else if (sourceMark.kind === 'display-math') {
      replacement = makeDisplayMath(sourceMark.getContent(cm))
    } else if (sourceMark.kind === 'outer-display-math') {
      replacement = makeDisplayMath(sourceMark.getOuter(cm))
    } else {
      throw new Error(`bad math mark ${sourceMark.kind}`)
    }

    const editorMark = makeSingleMark(cm, sourceMark, 'outer', true, {
      clearOnEnter: true,
      replacedWith: replacement
    })

    clearOnMouseDown(cm, replacement, editorMark)

    return editorMark
  }
}

function makeInlineMath(math) {
  var mathEl = $('<script type="math/tex">').text(math)
  var spanEl = $('<span>').append(mathEl).css({ 'font-family': 'Times' })
  return spanEl[0]
}

function makeDisplayMath(math) {
  var mathEl = $('<script type="math/tex; mode=display">').text(math)
  var divEl = $('<div>').append(mathEl).css({
    'text-align': 'center',
    'font-family': 'Times',
    'padding-bottom': '10pt',
    'padding-top': '10pt'
  })
  return divEl[0]
}

export default MathMarker
