import { makeSingleMark } from '../single_mark'
import { makeGroup } from '../utils'

/**
 * Mark inline formatting. Ideally, we'd get rid of the pre and post marks,
 * like we do with the section headings, but I can't quite get the
 * right behaviour with the current codemirror API.
 *
 *    \ t e x t b f {  t e x t  }
 *   ^               ^^       ^^ ^
 *     pre              peri    post
 *
 * Option 1: absorbing: when you type at either end, new text is bold
 *   pre:   inclusiveLeft, !inclusiveRight
 *   post: !inclusiveLeft,  inclusiveRight
 *
 * Option 2: not absorbing: when you type at either end, new text is not bold
 *   pre:  !inclusiveLeft,  inclusiveRight
 *   post:  inclusiveLeft, !inclusiveRight
 *
 * Option 1 mostly works, until you have a whole line of bold text; then you
 * can't add any more text to the start or end of the line without making it
 * bold, and if you try to write some text on the next line and then press
 * backspace at the start of that new line, it deletes the "}", and you lose
 * the formatting.
 *
 * Option 2 also mostly works, until you try to delete the first or last
 * bold character, because then it deletes both the outer mark and the
 * character you wanted to delete. I think this is because codemirror decides
 * how much to delete by effectively moving the cursor and then deleting the
 * characters in between. We could probably change that somehow.
 *
 * Neither option is very bad, but I think we should try it out with visible
 * markers, to make it more explicit.
 */
const FormattingMarker = {
  matcher(cm, sourceMark) {
    return sourceMark.kind === 'textbf' || sourceMark.kind === 'textit'
  },

  marker(cm, sourceMark) {
    const preMark = makeSingleMark(cm, sourceMark, 'pre', true, {
      replacedWith: makeSpan('{', sourceMark.kind)
    })
    const innerMark = makeSingleMark(cm, sourceMark, 'inner', false, {
      inclusiveLeft: true,
      inclusiveRight: true,
      clearWhenEmpty: false,
      className: `wl-${sourceMark.kind}`
    })
    const postMark = makeSingleMark(cm, sourceMark, 'post', true, {
      replacedWith: makeSpan('}', sourceMark.kind)
    })

    makeGroup([preMark, innerMark, postMark])
  }
}

function makeSpan(text, kind) {
  var el = $('<span>')
    .text(text)
    .addClass(`wl-${kind}-open`)

  return el[0]
}

export default FormattingMarker
